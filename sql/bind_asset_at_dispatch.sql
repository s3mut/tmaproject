-- Migration: Binding aset spesifik saat "Kirim Unit" (In Transit) untuk
-- transaksi berbasis kategori (asset_id belum ditentukan saat pengajuan).
-- Mencegah double-booking dengan validasi status 'Backup' real-time.

CREATE OR REPLACE FUNCTION public.update_transaction_status_safe(
    p_transaction_id        BIGINT,
    p_expected_current_status TEXT,
    p_new_status            TEXT,
    p_user_id               BIGINT,
    p_notes                 TEXT      DEFAULT NULL,
    p_asset_id              BIGINT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_status      TEXT;
    v_current_doc_status  SMALLINT;
    v_transaction_type    TEXT;
    v_duration_days       INTEGER;
    v_asset_id            BIGINT;
    v_from_site           VARCHAR(4);
    v_to_site              VARCHAR(4);
    v_category_id          INTEGER;
    v_asset_status_before  asset_status;
    v_effective_asset_id   BIGINT;
    v_candidate_status     asset_status;
    v_candidate_category   INTEGER;
    v_candidate_site       VARCHAR(4);
    v_now                  TIMESTAMPTZ := NOW();
BEGIN
    PERFORM pg_advisory_xact_lock(p_transaction_id);

    SELECT status::TEXT, doc_status, transaction_type, duration_days, asset_id,
           from_site_code, to_site_code, asset_status_before, category_id
    INTO v_current_status, v_current_doc_status, v_transaction_type, v_duration_days, v_asset_id,
         v_from_site, v_to_site, v_asset_status_before, v_category_id
    FROM asset_transactions
    WHERE id = p_transaction_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'NOT_FOUND', 'message', 'Transaksi tidak ditemukan.');
    END IF;

    IF v_current_doc_status = 1 THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'DOCUMENT_LOCKED',
            'message', 'Transaksi sudah dikunci (Submitted/Locked) dan tidak dapat dimodifikasi.',
            'current_status', v_current_status);
    END IF;

    IF v_current_status != p_expected_current_status THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'CONCURRENT_MODIFICATION',
            'message', 'Transaksi sudah diproses oleh admin lain. Silakan refresh dan coba lagi.',
            'expected_status', p_expected_current_status, 'current_status', v_current_status);
    END IF;

    IF NOT (
        (p_expected_current_status = 'Requested'   AND p_new_status IN ('Approved', 'Rejected', 'Cancelled')) OR
        (p_expected_current_status = 'Approved'    AND p_new_status IN ('In Transit', 'Cancelled')) OR
        (p_expected_current_status = 'In Transit'  AND p_new_status IN ('In Progress', 'Cancelled')) OR
        (p_expected_current_status = 'In Progress' AND p_new_status IN ('Returning', 'Completed')) OR
        (p_expected_current_status = 'Returning'   AND p_new_status IN ('Completed', 'Cancelled'))
    ) THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_TRANSITION',
            'message', format('Transisi dari "%s" ke "%s" tidak diizinkan oleh State Machine.', p_expected_current_status, p_new_status),
            'current_status', v_current_status, 'requested_new_status', p_new_status);
    END IF;

    v_effective_asset_id := COALESCE(p_asset_id, v_asset_id);

    IF p_new_status = 'Approved' THEN
        UPDATE asset_transactions
        SET status = 'Approved', approved_by = p_user_id, approved_at = v_now,
            notes = COALESCE(p_notes, notes)
        WHERE id = p_transaction_id;

        IF v_effective_asset_id IS NOT NULL AND v_asset_status_before IS NULL THEN
            UPDATE asset_transactions
            SET asset_status_before = (SELECT status FROM master_assets WHERE id = v_effective_asset_id)
            WHERE id = p_transaction_id;
        END IF;

    ELSIF p_new_status = 'In Transit' THEN
        -- NEW: Binding aset baru (jika category-based & belum pernah bind)
        IF p_asset_id IS NOT NULL AND v_asset_id IS NULL THEN
            SELECT status, category_id, site_alias
            INTO v_candidate_status, v_candidate_category, v_candidate_site
            FROM master_assets WHERE id = p_asset_id FOR UPDATE;

            IF NOT FOUND THEN
                RETURN jsonb_build_object('success', false, 'error_code', 'ASSET_NOT_FOUND',
                    'message', 'Aset yang dipilih tidak ditemukan.');
            END IF;

            IF v_candidate_status != 'Backup' THEN
                RETURN jsonb_build_object('success', false, 'error_code', 'ASSET_NOT_AVAILABLE',
                    'message', 'Aset ini sudah tidak berstatus Backup/Ready (mungkin baru saja dipakai transaksi lain). Pilih unit lain.');
            END IF;

            IF v_category_id IS NOT NULL AND v_candidate_category != v_category_id THEN
                RETURN jsonb_build_object('success', false, 'error_code', 'CATEGORY_MISMATCH',
                    'message', 'Kategori aset tidak sesuai dengan permintaan.');
            END IF;

            UPDATE asset_transactions
            SET asset_id = p_asset_id,
                from_site_code = COALESCE(from_site_code, v_candidate_site),
                asset_status_before = COALESCE(asset_status_before, v_candidate_status)
            WHERE id = p_transaction_id;

            v_effective_asset_id := p_asset_id;
        END IF;

        UPDATE asset_transactions
        SET status = 'In Transit', dispatched_by = p_user_id, dispatched_at = v_now,
            notes = COALESCE(p_notes, notes)
        WHERE id = p_transaction_id;

        IF v_effective_asset_id IS NOT NULL THEN
            UPDATE master_assets SET status = 'In Transit', updated_at = v_now
            WHERE id = v_effective_asset_id;
        END IF;

    ELSIF p_new_status = 'In Progress' THEN
        DECLARE
            v_due_date TIMESTAMPTZ := NULL;
        BEGIN
            IF v_transaction_type = 'Borrowing' AND v_duration_days IS NOT NULL THEN
                v_due_date := v_now + (v_duration_days || ' days')::INTERVAL;
            END IF;

            UPDATE asset_transactions
            SET status = 'In Progress', received_by = p_user_id, received_at = v_now,
                due_date = v_due_date,
                asset_id = COALESCE(p_asset_id, asset_id),
                notes = COALESCE(p_notes, notes)
            WHERE id = p_transaction_id;
        END;

        IF v_effective_asset_id IS NOT NULL THEN
            UPDATE master_assets
            SET status = CASE
                    WHEN v_transaction_type = 'Borrowing' THEN 'Borrow'::asset_status
                    WHEN v_transaction_type = 'Repair'    THEN 'Repair'::asset_status
                    ELSE status
                END,
                updated_at = v_now
            WHERE id = v_effective_asset_id;
        END IF;

    ELSIF p_new_status = 'Returning' THEN
        UPDATE asset_transactions
        SET status = 'Returning', notes = COALESCE(p_notes, notes)
        WHERE id = p_transaction_id;

        IF v_effective_asset_id IS NOT NULL THEN
            UPDATE master_assets SET status = 'In Transit', updated_at = v_now
            WHERE id = v_effective_asset_id;
        END IF;

    ELSIF p_new_status = 'Completed' THEN
        UPDATE asset_transactions
        SET status = 'Completed', completed_at = v_now, doc_status = 1,
            notes = COALESCE(p_notes, notes)
        WHERE id = p_transaction_id;

        IF v_effective_asset_id IS NOT NULL AND v_from_site IS NOT NULL AND v_to_site IS NOT NULL THEN
            DECLARE
                v_final_site VARCHAR(4);
            BEGIN
                v_final_site := CASE
                    WHEN v_transaction_type = 'Mutation'   THEN v_to_site
                    WHEN v_transaction_type = 'Borrowing'  THEN v_from_site
                    ELSE v_to_site
                END;

                UPDATE master_assets
                SET site_alias = v_final_site,
                    status = COALESCE(v_asset_status_before, status),
                    updated_at = v_now
                WHERE id = v_effective_asset_id;

                INSERT INTO asset_movement_logs (
                    asset_id, serial_number, event_type, document_code,
                    from_site_code, to_site_code, executor_id, notes
                )
                SELECT
                    v_effective_asset_id, ma.serial_number,
                    CASE
                        WHEN v_transaction_type = 'Mutation'  THEN 'MUTATION_COMPLETE'
                        WHEN v_transaction_type = 'Borrowing' THEN 'LOAN_COMPLETE'
                        ELSE 'TRANSACTION_COMPLETE'
                    END,
                    (SELECT transaction_code FROM asset_transactions WHERE id = p_transaction_id),
                    v_from_site, v_final_site, p_user_id, p_notes
                FROM master_assets ma WHERE ma.id = v_effective_asset_id;
            END;
        END IF;

    ELSIF p_new_status IN ('Rejected', 'Cancelled') THEN
        UPDATE asset_transactions
        SET status = p_new_status::transaction_status, doc_status = 2,
            notes = COALESCE(p_notes, notes)
        WHERE id = p_transaction_id;

        IF v_effective_asset_id IS NOT NULL THEN
            UPDATE master_assets
            SET status = COALESCE(v_asset_status_before, status), updated_at = v_now
            WHERE id = v_effective_asset_id;
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'new_status', p_new_status, 'transaction_id', p_transaction_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'DATABASE_ERROR', 'message', SQLERRM);
END;
$$;

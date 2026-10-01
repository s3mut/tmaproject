-- sql/add_disposal_documents.sql
-- Tabel snapshot dokumen BAPA (Reprint Center) + revisi RPC batch_approve_disposals

CREATE TABLE IF NOT EXISTS disposal_documents (
    id              BIGSERIAL PRIMARY KEY,
    bapa_no         VARCHAR(50) NOT NULL UNIQUE,
    disposal_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_by    BIGINT NOT NULL REFERENCES telegram_users(telegram_id)
                        ON UPDATE CASCADE ON DELETE RESTRICT,
    notes           TEXT,
    items           JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_items     INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disposal_documents_bapa_no ON disposal_documents(bapa_no);
CREATE INDEX IF NOT EXISTS idx_disposal_documents_disposal_date ON disposal_documents(disposal_date DESC);

ALTER TABLE disposal_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dd_all" ON disposal_documents;
CREATE POLICY "dd_all" ON disposal_documents FOR ALL USING (true) WITH CHECK (true);

-- Revisi RPC: snapshot lengkap (aktiva, reason, location) + cegah duplikat BAPA No
CREATE OR REPLACE FUNCTION public.batch_approve_disposals(
    p_asset_ids     BIGINT[],
    p_bapa_no       TEXT,
    p_approved_by   BIGINT,
    p_notes         TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_asset_id      BIGINT;
    v_serial        VARCHAR(100);
    v_aktiva        VARCHAR(50);
    v_brand         VARCHAR(50);
    v_model_type    VARCHAR(100);
    v_reason        VARCHAR(50);
    v_location      VARCHAR(100);
    v_processed     INT := 0;
    v_failed        INT := 0;
    v_results       JSONB := '[]';
BEGIN
    IF EXISTS (SELECT 1 FROM disposal_documents WHERE bapa_no = p_bapa_no) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'DUPLICATE_BAPA_NO',
            'message', format('Nomor BAPA "%s" sudah pernah digunakan.', p_bapa_no)
        );
    END IF;

    FOREACH v_asset_id IN ARRAY p_asset_ids
    LOOP
        BEGIN
            -- Ambil SEMUA data snapshot SEBELUM status/proposal berubah
            SELECT
                a.serial_number, a.aktiva, a.brand, a.model_type,
                dp.reason_category, COALESCE(s.site_name, a.site_alias, '-')
            INTO
                v_serial, v_aktiva, v_brand, v_model_type,
                v_reason, v_location
            FROM master_assets a
            LEFT JOIN disposal_proposals dp
                ON dp.asset_id = a.id AND dp.status = 'Pending'
            LEFT JOIN sites s
                ON s.site_alias = a.site_alias
            WHERE a.id = v_asset_id;

            UPDATE master_assets
            SET status = 'Disposed', updated_at = NOW()
            WHERE id = v_asset_id AND status = 'PENDING_DISPOSAL';

            IF NOT FOUND THEN
                v_failed := v_failed + 1;
                CONTINUE;
            END IF;

            UPDATE disposal_proposals
            SET status = 'Approved', reviewed_by = p_approved_by, reviewed_at = NOW(),
                review_notes = p_notes
            WHERE asset_id = v_asset_id AND status = 'Pending';

            INSERT INTO asset_movement_logs (
                asset_id, serial_number, event_type, document_code,
                executor_id, notes, metadata
            )
            VALUES (
                v_asset_id, v_serial, 'DISPOSAL_APPROVED', p_bapa_no,
                p_approved_by, p_notes,
                jsonb_build_object('bapa_no', p_bapa_no)
            );

            v_processed := v_processed + 1;
            v_results := v_results || jsonb_build_object(
                'asset_id', v_asset_id,
                'serial_number', v_serial,
                'aktiva', COALESCE(v_aktiva, '-'),
                'brand', COALESCE(v_brand, '-'),
                'model_type', COALESCE(v_model_type, '-'),
                'reason', COALESCE(v_reason, '-'),
                'location', COALESCE(v_location, '-'),
                'status', 'DISPOSED'
            );

        EXCEPTION WHEN OTHERS THEN
            v_failed := v_failed + 1;
        END;
    END LOOP;

    IF v_processed > 0 THEN
        INSERT INTO disposal_documents (bapa_no, disposal_date, processed_by, notes, items, total_items)
        VALUES (p_bapa_no, NOW(), p_approved_by, p_notes, v_results, v_processed);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'processed', v_processed,
        'failed', v_failed,
        'bapa_no', p_bapa_no,
        'results', v_results
    );
END;
$$;
-- ============================================================
-- E1-TMA: Enterprise-Grade Upgrade SQL Migration
-- File   : sql/upgrade_erp_standards.sql
-- Dibuat : 2026-09-22
-- Aman   : Idempotent (aman dijalankan berulang kali)
-- Urutan : Jalankan SELURUH isi file ini di Supabase SQL Editor
-- ============================================================

-- ============================================================
-- BAGIAN 0: ENUM ADDITIONS (Harus dijalankan TERPISAH dari
--           transaksi DDL lain karena bersifat non-transaksional)
-- ============================================================

-- 0.1 Tambahkan status aset baru: PENDING_DISPOSAL (antrian afkir)
ALTER TYPE asset_status ADD VALUE IF NOT EXISTS 'PENDING_DISPOSAL';

-- 0.2 Pastikan 'Returning' ada di transaction_status (ada di schema lama namun tidak di docs/schema.sql)
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'Returning';

-- Reload schema cache PostgREST agar enum baru dikenali
NOTIFY pgrst, 'reload schema';


-- ============================================================
-- BAGIAN 1: ASSET MOVEMENT LOGS (Immutable Stock Ledger)
-- Prinsip: Hanya bisa INSERT. Tidak ada UPDATE / DELETE.
-- Mencatat setiap pergerakan fisik aset antar site.
-- ============================================================

CREATE TABLE IF NOT EXISTS asset_movement_logs (
    id              BIGSERIAL PRIMARY KEY,
    logged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    asset_id        BIGINT NOT NULL,
    serial_number   VARCHAR(100) NOT NULL,         -- Denormalized untuk audit permanen
    event_type      VARCHAR(60)  NOT NULL,         -- Lihat konstanta EVENT_TYPE di bawah
    document_code   VARCHAR(100),                  -- Kode transaksi referensi (mis. BRW-220926-1234)
    from_site_code  VARCHAR(4),
    to_site_code    VARCHAR(4),
    executor_id     BIGINT,                        -- telegram_id pelaksana
    executor_name   VARCHAR(100),                  -- Denormalized untuk audit permanen
    notes           TEXT,
    metadata        JSONB DEFAULT '{}',            -- Data tambahan (tracking_number, dll)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_aml_asset    FOREIGN KEY (asset_id)    REFERENCES master_assets(id)       ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_aml_executor FOREIGN KEY (executor_id) REFERENCES telegram_users(telegram_id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Index untuk query per-aset (DocumentTimeline)
CREATE INDEX IF NOT EXISTS idx_aml_asset_id    ON asset_movement_logs (asset_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_aml_event_type  ON asset_movement_logs (event_type);
CREATE INDEX IF NOT EXISTS idx_aml_document    ON asset_movement_logs (document_code);

-- Komentar konstanta EVENT_TYPE yang valid:
COMMENT ON COLUMN asset_movement_logs.event_type IS
    'Konstanta valid: MUTATION_COMPLETE, LOAN_DISPATCH, LOAN_RETURN, LOAN_COMPLETE, '
    'DISPOSAL_PROPOSED, DISPOSAL_APPROVED, OPNAME_SCAN, RECONCILIATION_APPLIED, '
    'LOCATION_CORRECTION, STATUS_CHANGE';

-- ──────────────────────────────────────────────────────────
-- RLS: IMMUTABLE LEDGER
-- SELECT: semua bisa baca
-- INSERT: semua bisa tulis
-- UPDATE / DELETE: TIDAK ADA POLICY → diblokir secara default
-- ──────────────────────────────────────────────────────────
ALTER TABLE asset_movement_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aml_select" ON asset_movement_logs;
DROP POLICY IF EXISTS "aml_insert" ON asset_movement_logs;

CREATE POLICY "aml_select" ON asset_movement_logs
    FOR SELECT USING (true);

CREATE POLICY "aml_insert" ON asset_movement_logs
    FOR INSERT WITH CHECK (true);

-- Verifikasi immutability: jalankan setelah deploy untuk memastikan
-- DELETE FROM asset_movement_logs WHERE id = 1; → harus menghasilkan error RLS


-- ============================================================
-- BAGIAN 2: FIELD AUDIT TRAILS (PostgreSQL Trigger)
-- Memantau perubahan kolom krusial di master_assets:
-- status, site_alias, serial_number
-- ============================================================

-- 2.1 Tabel penyimpan audit field-level
CREATE TABLE IF NOT EXISTS field_audit_trails (
    id              BIGSERIAL PRIMARY KEY,
    table_name      TEXT        NOT NULL,
    record_id       BIGINT      NOT NULL,
    column_name     TEXT        NOT NULL,
    old_value       TEXT,
    new_value       TEXT,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fat_record   ON field_audit_trails (table_name, record_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_fat_column   ON field_audit_trails (column_name);

ALTER TABLE field_audit_trails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fat_select" ON field_audit_trails;
DROP POLICY IF EXISTS "fat_insert" ON field_audit_trails;

CREATE POLICY "fat_select" ON field_audit_trails FOR SELECT USING (true);
CREATE POLICY "fat_insert" ON field_audit_trails FOR INSERT WITH CHECK (true);
-- Tidak ada policy UPDATE / DELETE → immutable

-- 2.2 Trigger Function
CREATE OR REPLACE FUNCTION fn_audit_asset_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Audit perubahan kolom STATUS
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO field_audit_trails (table_name, record_id, column_name, old_value, new_value)
        VALUES ('master_assets', NEW.id, 'status', OLD.status::TEXT, NEW.status::TEXT);
    END IF;

    -- Audit perubahan kolom SITE_ALIAS (lokasi fisik)
    IF OLD.site_alias IS DISTINCT FROM NEW.site_alias THEN
        INSERT INTO field_audit_trails (table_name, record_id, column_name, old_value, new_value)
        VALUES ('master_assets', NEW.id, 'site_alias', OLD.site_alias, NEW.site_alias);
    END IF;

    -- Audit perubahan kolom SERIAL_NUMBER (jarang terjadi tapi krusial)
    IF OLD.serial_number IS DISTINCT FROM NEW.serial_number THEN
        INSERT INTO field_audit_trails (table_name, record_id, column_name, old_value, new_value)
        VALUES ('master_assets', NEW.id, 'serial_number', OLD.serial_number, NEW.serial_number);
    END IF;

    RETURN NEW;
END;
$$;

-- 2.3 Pasang Trigger ke tabel master_assets
DROP TRIGGER IF EXISTS trg_audit_asset_fields ON master_assets;

CREATE TRIGGER trg_audit_asset_fields
AFTER UPDATE ON master_assets
FOR EACH ROW
EXECUTE FUNCTION fn_audit_asset_fields();


-- ============================================================
-- BAGIAN 3: STOCK RECONCILIATIONS
-- Hasil Stock Opname disimpan sebagai Draft Rekonsiliasi.
-- Opname TIDAK boleh langsung mengubah status aset.
-- Perubahan hanya bisa dieksekusi setelah Super Admin Approve.
-- ============================================================

-- 3.1 Tambahkan ENUM baru untuk status rekonsiliasi
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reconciliation_status') THEN
        CREATE TYPE reconciliation_status AS ENUM ('Draft', 'Submitted', 'Approved', 'Rejected');
    END IF;
END $$;

-- 3.2 Tabel header rekonsiliasi (satu per sesi opname)
CREATE TABLE IF NOT EXISTS stock_reconciliations (
    id                    BIGSERIAL PRIMARY KEY,
    reconciliation_code   VARCHAR(100) UNIQUE NOT NULL,   -- Format: RECON-[SITEXX]-[YYYYMMDD]-[SEQ]
    opname_id             BIGINT NOT NULL,
    status                reconciliation_status NOT NULL DEFAULT 'Draft',
    doc_status            SMALLINT NOT NULL DEFAULT 0,    -- 0=Draft, 1=Submitted/Locked, 2=Cancelled
    submitted_by          BIGINT,
    approved_by           BIGINT,
    submitted_at          TIMESTAMPTZ,
    approved_at           TIMESTAMPTZ,
    variance_summary      JSONB NOT NULL DEFAULT '{"found":0,"missing":0,"misplaced":0}',
    notes                 TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_recon_opname     FOREIGN KEY (opname_id)    REFERENCES stock_opname(id)             ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_recon_submitted  FOREIGN KEY (submitted_by) REFERENCES telegram_users(telegram_id)  ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_recon_approved   FOREIGN KEY (approved_by)  REFERENCES telegram_users(telegram_id)  ON UPDATE CASCADE ON DELETE SET NULL,
    -- Aturan bisnis: Opname tidak boleh mengubah status langsung (doc_status = 0 = Draft)
    CONSTRAINT chk_recon_docstatus CHECK (doc_status IN (0, 1, 2))
);

CREATE INDEX IF NOT EXISTS idx_recon_opname  ON stock_reconciliations (opname_id);
CREATE INDEX IF NOT EXISTS idx_recon_status  ON stock_reconciliations (status, doc_status);

-- 3.3 Tabel detail item per rekonsiliasi
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proposed_action_type') THEN
        CREATE TYPE proposed_action_type AS ENUM ('MARK_MISSING', 'CORRECT_LOCATION', 'PROPOSE_DISPOSAL', 'NO_ACTION');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS stock_reconciliation_items (
    id                  BIGSERIAL PRIMARY KEY,
    reconciliation_id   BIGINT NOT NULL,
    asset_id            BIGINT,
    serial_number       VARCHAR(100),                     -- Denormalized untuk kasus aset dihapus
    opname_status       opname_status NOT NULL,           -- Ditemukan / Hilang / Nyasar
    proposed_action     proposed_action_type NOT NULL DEFAULT 'NO_ACTION',
    approved_action     proposed_action_type,             -- Diisi saat Super Admin approve
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_sri_reconciliation FOREIGN KEY (reconciliation_id) REFERENCES stock_reconciliations(id) ON DELETE CASCADE,
    CONSTRAINT fk_sri_asset          FOREIGN KEY (asset_id)          REFERENCES master_assets(id)         ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sri_recon   ON stock_reconciliation_items (reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_sri_asset   ON stock_reconciliation_items (asset_id);

-- RLS untuk reconciliation tables
ALTER TABLE stock_reconciliations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_reconciliation_items  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recon_all"  ON stock_reconciliations;
DROP POLICY IF EXISTS "recon_items_all" ON stock_reconciliation_items;

CREATE POLICY "recon_all"       ON stock_reconciliations       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "recon_items_all" ON stock_reconciliation_items  FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- BAGIAN 4: DISPOSAL PROPOSALS TABLE
-- Tabel untuk menyimpan usulan afkir (Ad-Hoc maupun dari Opname)
-- ============================================================

CREATE TABLE IF NOT EXISTS disposal_proposals (
    id              BIGSERIAL PRIMARY KEY,
    asset_id        BIGINT NOT NULL,
    serial_number   VARCHAR(100) NOT NULL,   -- Denormalized
    reason_category VARCHAR(100) NOT NULL,   -- Mis: 'Kerusakan Fisik Berat', 'Usia > 5 Tahun'
    reason_detail   TEXT,
    photo_url       TEXT,                    -- URL ke Supabase Storage
    proposed_by     BIGINT NOT NULL,
    proposed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source          VARCHAR(50) NOT NULL DEFAULT 'AD_HOC',  -- 'AD_HOC' atau 'OPNAME'
    opname_id       BIGINT,                  -- Diisi jika source = OPNAME
    status          VARCHAR(30) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    reviewed_by     BIGINT,
    reviewed_at     TIMESTAMPTZ,
    review_notes    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_dp_asset      FOREIGN KEY (asset_id)    REFERENCES master_assets(id)             ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_dp_proposed   FOREIGN KEY (proposed_by) REFERENCES telegram_users(telegram_id)   ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_dp_reviewed   FOREIGN KEY (reviewed_by) REFERENCES telegram_users(telegram_id)   ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_dp_opname     FOREIGN KEY (opname_id)   REFERENCES stock_opname(id)              ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_dp_source    CHECK (source IN ('AD_HOC', 'OPNAME')),
    CONSTRAINT chk_dp_status    CHECK (status IN ('Pending', 'Approved', 'Rejected'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dp_asset_pending
    ON disposal_proposals (asset_id)
    WHERE status = 'Pending';  -- Hanya boleh ada 1 usulan aktif per aset

CREATE INDEX IF NOT EXISTS idx_dp_status    ON disposal_proposals (status, proposed_at DESC);
CREATE INDEX IF NOT EXISTS idx_dp_proposed  ON disposal_proposals (proposed_by);

ALTER TABLE disposal_proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dp_all" ON disposal_proposals;
CREATE POLICY "dp_all" ON disposal_proposals FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- BAGIAN 5: KOLOM TAMBAHAN asset_transactions (DocStatus + Subtype)
-- ============================================================

ALTER TABLE asset_transactions
    ADD COLUMN IF NOT EXISTS doc_status             SMALLINT     DEFAULT 0,
    ADD COLUMN IF NOT EXISTS transaction_subtype    VARCHAR(50)  DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS parent_transaction_id  BIGINT       REFERENCES asset_transactions(id) ON DELETE SET NULL;

COMMENT ON COLUMN asset_transactions.doc_status IS
    '0=Draft (bisa diedit), 1=Submitted/Locked (tidak bisa diedit), 2=Cancelled';
COMMENT ON COLUMN asset_transactions.transaction_subtype IS
    'Subtipe opsional: MaterialRequest, DeliveryNote, PartialFulfillment';
COMMENT ON COLUMN asset_transactions.parent_transaction_id IS
    'Referensi ke transaksi induk (untuk Partial Fulfillment / Delivery Note dari Material Request)';

-- Backfill: set doc_status = 0 untuk semua transaksi existing yang NULL
UPDATE asset_transactions
    SET doc_status = 0
    WHERE doc_status IS NULL;

-- Constraint: Completed/Rejected/Cancelled → doc_status harus 1 (locked)
-- Ini hanya sebagai konvensi; enforcement di application layer
CREATE INDEX IF NOT EXISTS idx_trx_docstatus ON asset_transactions (doc_status, status);


-- ============================================================
-- BAGIAN 6: RPC — update_transaction_status_safe()
-- Anti-Race Condition via PostgreSQL Advisory Lock + Optimistic Locking
-- Mencegah dua admin menekan approve bersamaan
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_transaction_status_safe(
    p_transaction_id        BIGINT,
    p_expected_current_status TEXT,   -- Status yang diharapkan (untuk deteksi konflik)
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
    v_current_status    TEXT;
    v_current_doc_status SMALLINT;
    v_transaction_type  TEXT;
    v_duration_days     INTEGER;
    v_asset_id          BIGINT;
    v_from_site         VARCHAR(4);
    v_to_site           VARCHAR(4);
    v_updates           JSONB := '{}';
    v_now               TIMESTAMPTZ := NOW();
BEGIN
    -- ── STEP 1: Acquire Advisory Lock per Transaction ID ──────────────────
    -- Mencegah concurrent updates pada transaksi yang sama
    PERFORM pg_advisory_xact_lock(p_transaction_id);

    -- ── STEP 2: Baca status saat ini dengan FOR UPDATE (row-level lock) ───
    SELECT status::TEXT, doc_status, transaction_type, duration_days, asset_id, from_site_code, to_site_code
    INTO v_current_status, v_current_doc_status, v_transaction_type, v_duration_days, v_asset_id, v_from_site, v_to_site
    FROM asset_transactions
    WHERE id = p_transaction_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'NOT_FOUND',
            'message', 'Transaksi tidak ditemukan.'
        );
    END IF;

    -- ── STEP 3: DocStatus Check — Locked transactions cannot be modified ──
    IF v_current_doc_status = 1 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'DOCUMENT_LOCKED',
            'message', 'Transaksi sudah dikunci (Submitted/Locked) dan tidak dapat dimodifikasi.',
            'current_status', v_current_status
        );
    END IF;

    -- ── STEP 4: Optimistic Locking — Cek apakah status masih sesuai harapan
    IF v_current_status != p_expected_current_status THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CONCURRENT_MODIFICATION',
            'message', 'Transaksi sudah diproses oleh admin lain. Silakan refresh dan coba lagi.',
            'expected_status', p_expected_current_status,
            'current_status', v_current_status
        );
    END IF;

    -- ── STEP 5: State Machine Validation ─────────────────────────────────
    IF NOT (
        (p_expected_current_status = 'Requested'   AND p_new_status IN ('Approved', 'Rejected', 'Cancelled')) OR
        (p_expected_current_status = 'Approved'    AND p_new_status IN ('In Transit', 'Cancelled')) OR
        (p_expected_current_status = 'In Transit'  AND p_new_status IN ('In Progress', 'Cancelled')) OR
        (p_expected_current_status = 'In Progress' AND p_new_status IN ('Returning', 'Completed')) OR
        (p_expected_current_status = 'Returning'   AND p_new_status IN ('Completed', 'Cancelled'))
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_TRANSITION',
            'message', format('Transisi dari "%s" ke "%s" tidak diizinkan oleh State Machine.', p_expected_current_status, p_new_status),
            'current_status', v_current_status,
            'requested_new_status', p_new_status
        );
    END IF;

    -- ── STEP 6: Persiapkan UPDATE berdasarkan status baru ─────────────────
    -- (Dilakukan via individual UPDATE statements untuk kemudahan)

    IF p_new_status = 'Approved' THEN
        UPDATE asset_transactions
        SET status = 'Approved', approved_by = p_user_id, approved_at = v_now,
            notes = COALESCE(p_notes, notes)
        WHERE id = p_transaction_id;

    ELSIF p_new_status = 'In Transit' THEN
        UPDATE asset_transactions
        SET status = 'In Transit', dispatched_by = p_user_id, dispatched_at = v_now,
            notes = COALESCE(p_notes, notes)
        WHERE id = p_transaction_id;

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

    ELSIF p_new_status = 'Returning' THEN
        UPDATE asset_transactions
        SET status = 'Returning', notes = COALESCE(p_notes, notes)
        WHERE id = p_transaction_id;

    ELSIF p_new_status = 'Completed' THEN
        -- Lock dokumen (doc_status = 1) saat Completed
        UPDATE asset_transactions
        SET status = 'Completed', completed_at = v_now, doc_status = 1,
            notes = COALESCE(p_notes, notes)
        WHERE id = p_transaction_id;

        -- Restorasi / Mutasi lokasi fisik aset
        IF v_asset_id IS NOT NULL AND v_from_site IS NOT NULL AND v_to_site IS NOT NULL THEN
            DECLARE
                v_final_site VARCHAR(4);
            BEGIN
                v_final_site := CASE
                    WHEN v_transaction_type = 'Mutation'   THEN v_to_site    -- Mutasi: pindah permanen
                    WHEN v_transaction_type = 'Borrowing'  THEN v_from_site  -- Pinjam: kembali ke asal
                    ELSE v_to_site
                END;

                UPDATE master_assets
                SET site_alias = v_final_site, updated_at = v_now
                WHERE id = v_asset_id;

                -- Catat di Immutable Ledger
                INSERT INTO asset_movement_logs (
                    asset_id, serial_number, event_type, document_code,
                    from_site_code, to_site_code, executor_id, notes
                )
                SELECT
                    v_asset_id, ma.serial_number,
                    CASE
                        WHEN v_transaction_type = 'Mutation'  THEN 'MUTATION_COMPLETE'
                        WHEN v_transaction_type = 'Borrowing' THEN 'LOAN_COMPLETE'
                        ELSE 'TRANSACTION_COMPLETE'
                    END,
                    (SELECT transaction_code FROM asset_transactions WHERE id = p_transaction_id),
                    v_from_site, v_final_site, p_user_id, p_notes
                FROM master_assets ma WHERE ma.id = v_asset_id;
            END;
        END IF;

    ELSIF p_new_status IN ('Rejected', 'Cancelled') THEN
        UPDATE asset_transactions
        SET status = p_new_status::transaction_status, doc_status = 2,
            notes = COALESCE(p_notes, notes)
        WHERE id = p_transaction_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'new_status', p_new_status,
        'transaction_id', p_transaction_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error_code', 'DATABASE_ERROR',
        'message', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_transaction_status_safe(BIGINT, TEXT, TEXT, BIGINT, TEXT, BIGINT)
    TO anon, authenticated;


-- ============================================================
-- BAGIAN 7: RPC — propose_asset_disposal()
-- Atomic: set status PENDING_DISPOSAL + insert disposal_proposals
-- ============================================================

CREATE OR REPLACE FUNCTION public.propose_asset_disposal(
    p_asset_id          BIGINT,
    p_reason_category   VARCHAR(100),
    p_reason_detail     TEXT          DEFAULT NULL,
    p_photo_url         TEXT          DEFAULT NULL,
    p_proposed_by       BIGINT        DEFAULT NULL,
    p_source            VARCHAR(50)   DEFAULT 'AD_HOC',
    p_opname_id         BIGINT        DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_status asset_status;
    v_serial         VARCHAR(100);
    v_proposal_id    BIGINT;
BEGIN
    -- Ambil status dan SN saat ini
    SELECT status, serial_number
    INTO v_current_status, v_serial
    FROM master_assets
    WHERE id = p_asset_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'NOT_FOUND',
            'message', 'Aset tidak ditemukan.');
    END IF;

    -- Validasi: aset yang sudah PENDING_DISPOSAL atau Disposed tidak bisa diusulkan lagi
    IF v_current_status IN ('PENDING_DISPOSAL', 'Disposed') THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'ALREADY_IN_DISPOSAL',
            'message', format('Aset sudah berstatus %s. Tidak dapat mengusulkan afkir lagi.', v_current_status));
    END IF;

    -- Update status aset → PENDING_DISPOSAL
    UPDATE master_assets
    SET status = 'PENDING_DISPOSAL', updated_at = NOW()
    WHERE id = p_asset_id;

    -- Insert disposal proposal
    INSERT INTO disposal_proposals (
        asset_id, serial_number, reason_category, reason_detail,
        photo_url, proposed_by, source, opname_id
    )
    VALUES (
        p_asset_id, v_serial, p_reason_category, p_reason_detail,
        p_photo_url, p_proposed_by, p_source, p_opname_id
    )
    RETURNING id INTO v_proposal_id;

    -- Catat di Movement Log
    INSERT INTO asset_movement_logs (
        asset_id, serial_number, event_type, executor_id, notes, metadata
    )
    VALUES (
        p_asset_id, v_serial, 'DISPOSAL_PROPOSED', p_proposed_by,
        format('[%s] %s', p_source, p_reason_category),
        jsonb_build_object('proposal_id', v_proposal_id, 'reason_detail', p_reason_detail)
    );

    RETURN jsonb_build_object(
        'success', true,
        'proposal_id', v_proposal_id,
        'serial_number', v_serial
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.propose_asset_disposal(BIGINT, VARCHAR, TEXT, TEXT, BIGINT, VARCHAR, BIGINT)
    TO anon, authenticated;


-- ============================================================
-- BAGIAN 8: RPC — batch_approve_disposals()
-- Atomic batch approval: set status Disposed + log BAPA
-- ============================================================

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
    v_processed     INT := 0;
    v_failed        INT := 0;
    v_results       JSONB := '[]';
BEGIN
    FOREACH v_asset_id IN ARRAY p_asset_ids
    LOOP
        BEGIN
            SELECT serial_number INTO v_serial FROM master_assets WHERE id = v_asset_id;

            -- Update status aset → Disposed
            UPDATE master_assets
            SET status = 'Disposed', updated_at = NOW()
            WHERE id = v_asset_id AND status = 'PENDING_DISPOSAL';

            IF NOT FOUND THEN
                v_failed := v_failed + 1;
                CONTINUE;
            END IF;

            -- Update disposal proposal → Approved
            UPDATE disposal_proposals
            SET status = 'Approved', reviewed_by = p_approved_by, reviewed_at = NOW(),
                review_notes = p_notes
            WHERE asset_id = v_asset_id AND status = 'Pending';

            -- Catat di Immutable Ledger
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
                'asset_id', v_asset_id, 'serial_number', v_serial, 'status', 'DISPOSED'
            );

        EXCEPTION WHEN OTHERS THEN
            v_failed := v_failed + 1;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'processed', v_processed,
        'failed', v_failed,
        'bapa_no', p_bapa_no,
        'results', v_results
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.batch_approve_disposals(BIGINT[], TEXT, BIGINT, TEXT)
    TO anon, authenticated;


-- ============================================================
-- BAGIAN 9: VIEW — view_disposal_queue
-- Untuk Disposal Queue UI — Super Admin melihat antrean afkir
-- ============================================================

DROP VIEW IF EXISTS view_disposal_queue;
CREATE VIEW view_disposal_queue AS
SELECT
    dp.id                   AS proposal_id,
    dp.asset_id,
    dp.serial_number,
    dp.reason_category,
    dp.reason_detail,
    dp.photo_url,
    dp.proposed_at,
    dp.source,
    dp.status               AS proposal_status,
    tu.name                 AS proposed_by_name,
    tu.telegram_id          AS proposed_by_id,
    ma.brand,
    ma.model_type,
    ma.computer_name,
    ma.site_alias,
    ma.status               AS asset_status,
    c.name                  AS category_name,
    c.icon                  AS category_icon,
    c.color_text            AS category_color_text,
    c.color_bg              AS category_color_bg,
    s.site_name,
    s.region
FROM disposal_proposals dp
JOIN master_assets ma       ON ma.id = dp.asset_id
JOIN master_categories c    ON c.id  = ma.category_id
JOIN telegram_users tu      ON tu.telegram_id = dp.proposed_by
LEFT JOIN sites s           ON s.site_alias = ma.site_alias
WHERE dp.status = 'Pending'
ORDER BY dp.proposed_at ASC;


-- ============================================================
-- BAGIAN 10: VIEW — view_asset_timeline
-- Untuk DocumentTimeline komponen — riwayat pergerakan per aset
-- ============================================================

DROP VIEW IF EXISTS view_asset_timeline;
CREATE VIEW view_asset_timeline AS
SELECT
    aml.id,
    aml.logged_at,
    aml.asset_id,
    aml.serial_number,
    aml.event_type,
    aml.document_code,
    aml.from_site_code,
    aml.to_site_code,
    aml.executor_id,
    aml.executor_name,
    aml.notes,
    aml.metadata,
    sf.site_name            AS from_site_name,
    st.site_name            AS to_site_name,
    tu.name                 AS executor_full_name
FROM asset_movement_logs aml
LEFT JOIN sites sf          ON sf.site_code = aml.from_site_code
LEFT JOIN sites st          ON st.site_code = aml.to_site_code
LEFT JOIN telegram_users tu ON tu.telegram_id = aml.executor_id
ORDER BY aml.logged_at DESC;


-- ============================================================
-- FINAL: Reload schema cache PostgREST
-- ============================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- SELESAI
-- Ringkasan tabel/view yang dibuat/dimodifikasi:
--
-- BARU:
--   asset_movement_logs          (Immutable Stock Ledger)
--   field_audit_trails           (Field-level Audit Trigger)
--   stock_reconciliations        (Header Rekonsiliasi Opname)
--   stock_reconciliation_items   (Detail item rekonsiliasi)
--   disposal_proposals           (Usulan afkir ad-hoc / opname)
--
-- MODIFIKASI:
--   asset_transactions           (+ doc_status, transaction_subtype, parent_transaction_id)
--
-- BARU (VIEWs):
--   view_disposal_queue          (Antrean afkir untuk Super Admin)
--   view_asset_timeline          (Timeline pergerakan per aset)
--
-- BARU (TRIGGER):
--   trg_audit_asset_fields       (Pada master_assets)
--
-- BARU (RPCs):
--   update_transaction_status_safe()
--   propose_asset_disposal()
--   batch_approve_disposals()
-- ============================================================

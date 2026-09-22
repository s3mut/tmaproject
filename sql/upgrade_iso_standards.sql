-- ============================================================
-- E1-TMA: Enterprise ISO Standards Upgrade (ISO 19770, ISO 27001, ISO 9001)
-- File   : sql/upgrade_iso_standards.sql
-- ============================================================

-- ============================================================
-- FASE 1.1: ASSET MOVEMENT LOGS (ISO 19770 & ISO 27001 Immutable Ledger)
-- Prinsip: Hanya bisa INSERT. Tidak ada UPDATE / DELETE.
-- Mencatat setiap pergerakan fisik aset antar site.
-- ============================================================

CREATE TABLE IF NOT EXISTS asset_movement_logs (
    id              BIGSERIAL PRIMARY KEY,
    logged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    asset_id        BIGINT NOT NULL,
    serial_number   VARCHAR(100) NOT NULL,
    event_type      VARCHAR(60)  NOT NULL,
    document_code   VARCHAR(100),
    from_site_code  VARCHAR(4),
    to_site_code    VARCHAR(4),
    executor_id     BIGINT,
    executor_name   VARCHAR(100),
    notes           TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_aml_asset    FOREIGN KEY (asset_id)    REFERENCES master_assets(id)       ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_aml_executor FOREIGN KEY (executor_id) REFERENCES telegram_users(telegram_id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_aml_asset_id    ON asset_movement_logs (asset_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_aml_event_type  ON asset_movement_logs (event_type);

-- RLS: IMMUTABLE LEDGER
ALTER TABLE asset_movement_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aml_select" ON asset_movement_logs;
DROP POLICY IF EXISTS "aml_insert" ON asset_movement_logs;

CREATE POLICY "aml_select" ON asset_movement_logs FOR SELECT USING (true);
CREATE POLICY "aml_insert" ON asset_movement_logs FOR INSERT WITH CHECK (true);
-- Tidak ada policy UPDATE/DELETE, sehingga by default terblokir.

-- ============================================================
-- FASE 1.2: FIELD AUDIT TRAILS (ISO 27001 Data Integrity)
-- Memantau perubahan kolom krusial di master_assets.
-- ============================================================

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

ALTER TABLE field_audit_trails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fat_select" ON field_audit_trails;
DROP POLICY IF EXISTS "fat_insert" ON field_audit_trails;
CREATE POLICY "fat_select" ON field_audit_trails FOR SELECT USING (true);
CREATE POLICY "fat_insert" ON field_audit_trails FOR INSERT WITH CHECK (true);

-- Trigger Function
CREATE OR REPLACE FUNCTION fn_audit_asset_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO field_audit_trails (table_name, record_id, column_name, old_value, new_value)
        VALUES ('master_assets', NEW.id, 'status', OLD.status::TEXT, NEW.status::TEXT);
    END IF;

    IF OLD.site_alias IS DISTINCT FROM NEW.site_alias THEN
        INSERT INTO field_audit_trails (table_name, record_id, column_name, old_value, new_value)
        VALUES ('master_assets', NEW.id, 'site_alias', OLD.site_alias, NEW.site_alias);
    END IF;

    IF OLD.serial_number IS DISTINCT FROM NEW.serial_number THEN
        INSERT INTO field_audit_trails (table_name, record_id, column_name, old_value, new_value)
        VALUES ('master_assets', NEW.id, 'serial_number', OLD.serial_number, NEW.serial_number);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_asset_fields ON master_assets;
CREATE TRIGGER trg_audit_asset_fields
AFTER UPDATE ON master_assets
FOR EACH ROW
EXECUTE FUNCTION fn_audit_asset_fields();

-- ============================================================
-- FASE 1.3: KONSEP STATE MACHINE & DOC STATUS (ISO 9001)
-- 0=Draft, 1=Submitted/Locked, 2=Cancelled
-- ============================================================

ALTER TABLE asset_transactions
    ADD COLUMN IF NOT EXISTS doc_status SMALLINT DEFAULT 0;

COMMENT ON COLUMN asset_transactions.doc_status IS '0=Draft (bisa diedit), 1=Submitted/Locked (tidak bisa diedit), 2=Cancelled';

-- Set existing records to 0
UPDATE asset_transactions SET doc_status = 0 WHERE doc_status IS NULL;

-- ============================================================
-- FASE 2.1: DISPOSAL WORKFLOW
-- Tambahkan status PENDING_DISPOSAL
-- ============================================================

ALTER TYPE asset_status ADD VALUE IF NOT EXISTS 'PENDING_DISPOSAL';
NOTIFY pgrst, 'reload schema';

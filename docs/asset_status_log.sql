-- ============================================================
-- FEATURE: Asset Status Audit Trail & Retired Reports
-- Jalankan script ini di Supabase SQL Editor
-- ============================================================

-- 1. Create Log Table
CREATE TABLE IF NOT EXISTS asset_status_logs (
    id BIGSERIAL PRIMARY KEY,
    asset_id BIGINT NOT NULL,
    old_status asset_status NOT NULL,
    new_status asset_status NOT NULL,
    changed_by BIGINT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_status_log_asset FOREIGN KEY (asset_id) REFERENCES master_assets(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_status_log_user FOREIGN KEY (changed_by) REFERENCES telegram_users(telegram_id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 2. RPC to Change Asset Status securely and log it
CREATE OR REPLACE FUNCTION public.change_asset_status(
  p_asset_id BIGINT,
  p_new_status asset_status,
  p_telegram_id BIGINT,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status asset_status;
  v_rows INT;
BEGIN
  -- Dapatkan status lama
  SELECT status INTO v_old_status FROM master_assets WHERE id = p_asset_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aset tidak ditemukan';
  END IF;

  -- Jika status tidak berubah, tidak perlu melakukan apa-apa
  IF v_old_status = p_new_status THEN
    RETURN TRUE;
  END IF;

  -- Update master_assets
  UPDATE master_assets
  SET status = p_new_status
  WHERE id = p_asset_id;

  -- Insert ke log
  INSERT INTO asset_status_logs (asset_id, old_status, new_status, changed_by, notes)
  VALUES (p_asset_id, v_old_status, p_new_status, p_telegram_id, p_notes);

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.change_asset_status(BIGINT, asset_status, BIGINT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.change_asset_status(BIGINT, asset_status, BIGINT, TEXT) TO authenticated;

-- 3. View for Retired Assets Report
-- Menggabungkan data master_assets, master_categories, asset_status_logs (terakhir di-retired), dan telegram_users (yang mengubah).
DROP VIEW IF EXISTS view_retired_reports;
CREATE VIEW view_retired_reports AS
SELECT 
    log.id AS log_id,
    a.id AS asset_id,
    a.serial_number,
    a.aktiva,
    c.name AS category_name,
    a.brand,
    a.model_type,
    a.site_alias,
    log.notes,
    log.created_at AS retired_at,
    log.changed_by AS retired_by_id,
    u.name AS retired_by_name
FROM asset_status_logs log
JOIN master_assets a ON a.id = log.asset_id
JOIN master_categories c ON c.id = a.category_id
JOIN telegram_users u ON u.telegram_id = log.changed_by
WHERE log.new_status = 'Retired'
  -- Memastikan kita mengambil status log yang valid (aset tersebut saat ini masih Retired)
  AND a.status = 'Retired';

-- 4. Reload schema cache PostgREST
NOTIFY pgrst, 'reload schema';

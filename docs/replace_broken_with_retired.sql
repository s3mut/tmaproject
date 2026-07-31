-- ============================================================
-- Migration: Mengganti status 'Broken' menjadi 'Retired'
-- TransitTMA — 2026-07-31
-- ============================================================

-- 1. Update data existing yang statusnya 'Broken' menjadi 'Retired'
UPDATE master_assets SET status = 'Retired' WHERE status = 'Broken';

-- 2. Rename ENUM lama
ALTER TYPE asset_status RENAME TO asset_status_old;

-- 3. Buat ENUM baru tanpa 'Broken' (Retired sudah dimasukkan di ujung)
CREATE TYPE asset_status AS ENUM ('Active', 'Backup', 'Repair', 'Disposed', 'In Transit', 'Retired');

-- 4. Ubah tipe kolom di tabel master_assets
ALTER TABLE master_assets ALTER COLUMN status DROP DEFAULT;
ALTER TABLE master_assets ALTER COLUMN status TYPE asset_status USING status::text::asset_status;
ALTER TABLE master_assets ALTER COLUMN status SET DEFAULT 'Active';

-- 5. Hapus ENUM lama
DROP TYPE asset_status_old;

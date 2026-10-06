-- Migration 1: Perluasan enum asset_status + kolom snapshot status
-- WAJIB dijalankan dan di-commit SEBELUM Migration 2 (enum value baru
-- tidak boleh dipakai dalam transaksi yang sama dengan ALTER TYPE-nya)

ALTER TYPE asset_status ADD VALUE IF NOT EXISTS 'Borrow';

ALTER TABLE asset_transactions ADD COLUMN IF NOT EXISTS asset_status_before asset_status;

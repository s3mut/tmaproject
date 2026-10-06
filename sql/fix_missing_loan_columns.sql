-- Fix: duration_days dan due_date tertinggal saat migrasi dari tabel
-- asset_loans lama ke asset_transactions terpadu. Kolom ini sudah dipakai
-- di TypeScript, RPC update_transaction_status_safe, dan UI sejak lama,
-- tapi tidak pernah benar-benar ada di DB — menyebabkan SEMUA transaksi
-- Borrowing gagal dibuat sejak awal.

ALTER TABLE asset_transactions ADD COLUMN IF NOT EXISTS duration_days INTEGER;
ALTER TABLE asset_transactions ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';

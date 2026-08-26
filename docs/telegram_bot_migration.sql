-- Migration Script: Telegram Bot Webhook Approval Flow
-- Tanggal: 2026-08-26

-- 1. Tambahkan kolom region ke telegram_users agar notifikasi DM tepat sasaran
ALTER TABLE public.telegram_users 
ADD COLUMN IF NOT EXISTS region VARCHAR(50);

-- Catatan: Setelah menjalankan script ini, pastikan untuk mengisi kolom 'region' 
-- untuk user-user IT yang ada di tabel telegram_users agar mereka bisa menerima DM persetujuan.

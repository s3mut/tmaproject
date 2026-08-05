-- ============================================================================
-- TRANSITTMA: MIGRATION SCRIPT FOR ASSET LOAN MANAGEMENT SYSTEM
-- ============================================================================
-- Dijalankan di Supabase SQL Editor / PostgreSQL Query Editor
-- ============================================================================

-- 1. Buat Tabel `asset_loans`
CREATE TABLE IF NOT EXISTS public.asset_loans (
  id BIGSERIAL PRIMARY KEY,
  loan_code TEXT UNIQUE NOT NULL,             -- Contoh: 'LOAN-JKT01-2608-0001'
  site_alias TEXT NOT NULL,                   -- Alias Toko peminjam (FK -> sites.site_alias)
  category_name TEXT NOT NULL,                -- Kategori device yang diminta (misal: 'POS', 'Monitor Kasir')
  purpose TEXT NOT NULL,                      -- Tujuan / Alasan pinjam
  duration_days INTEGER NOT NULL DEFAULT 14,  -- Estimasi durasi standar
  requires_it_approval BOOLEAN DEFAULT FALSE, -- True jika minta durasi > 14 hari atau tambahan waktu
  due_date TIMESTAMPTZ NOT NULL,              -- Target tanggal pengembalian
  shipping_method TEXT NOT NULL,              -- 'Pick-up' atau 'Delivery'
  tracking_number TEXT NULL,                  -- Nomor resi kurir / ekspedisi jika Delivery
  asset_id BIGINT NULL REFERENCES public.master_assets(id), -- Diisi tim IT saat Dispatch via scan barcode
  status TEXT NOT NULL DEFAULT 'Requested',   -- 'Requested', 'In-Transit', 'Borrowed', 'Return In-Transit', 'Closed', 'Rejected'
  condition_on_return TEXT NULL,              -- 'Bagus', 'Rusak', 'Hilang'
  requested_by_id BIGINT NOT NULL,            -- Telegram ID peminjam
  requested_by_name TEXT NOT NULL,            -- Nama peminjam
  dispatched_by_name TEXT NULL,               -- Tim IT yang menyerahkan / mengalokasi
  received_by_name TEXT NULL,                 -- User Toko yang menyeken / menerima unit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  dispatched_at TIMESTAMPTZ NULL,
  received_at TIMESTAMPTZ NULL,
  returned_at TIMESTAMPTZ NULL,
  closed_at TIMESTAMPTZ NULL,
  notes TEXT NULL                             -- Catatan tambahan / alasan penolakan
);

-- 2. Buat Index untuk percepatan query berdasarkan status dan site
CREATE INDEX IF NOT EXISTS idx_asset_loans_status ON public.asset_loans(status);
CREATE INDEX IF NOT EXISTS idx_asset_loans_site_alias ON public.asset_loans(site_alias);
CREATE INDEX IF NOT EXISTS idx_asset_loans_due_date ON public.asset_loans(due_date);

-- 3. Aktifkan Row Level Security (RLS) dan kebijakan akses terbuka untuk aplikasi
ALTER TABLE public.asset_loans ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'asset_loans' AND policyname = 'Allow public read-write for TMA'
  ) THEN
    CREATE POLICY "Allow public read-write for TMA" ON public.asset_loans
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- SELESAI. Tabel asset_loans siap digunakan oleh TransitTMA!
-- ============================================================================

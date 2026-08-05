-- ==============================================================================
-- TRANSITTMA: UPGRADE RBAC (USER ASSIGNED REGION) & CROSS-REGION WORKFLOW
-- Jalankan script ini di Supabase SQL Editor (idempotent / aman diulang)
-- ==============================================================================

-- ── 1. Penambahan Wewenang Wilayah (assigned_region) pada tabel telegram_users ──
ALTER TABLE public.telegram_users
  ADD COLUMN IF NOT EXISTS assigned_region VARCHAR(100) DEFAULT NULL;

COMMENT ON COLUMN public.telegram_users.assigned_region IS 'Wilayah wewenang untuk IT Support (role user), misal JKT, JATIM, WEST. NULL jika Admin Global atau Guest.';

-- ── 2. Perbarui RPC verify_web_login_v2 agar menyertakan assigned_region ──
DROP FUNCTION IF EXISTS public.verify_web_login_v2(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.verify_web_login_v2(
  p_identifier TEXT,
  p_password   TEXT
)
RETURNS TABLE(
  telegram_id    BIGINT,
  name           TEXT,
  username       TEXT,
  role           TEXT,
  is_active      BOOLEAN,
  notes          TEXT,
  created_at     TIMESTAMPTZ,
  assigned_region TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.telegram_id,
    u.name::TEXT,
    u.username::TEXT,
    u.role::TEXT,
    u.is_active,
    u.notes::TEXT,
    u.created_at::TIMESTAMPTZ,
    u.assigned_region::TEXT
  FROM telegram_users u
  WHERE
    (
      -- login dengan angka Telegram ID
      (p_identifier ~ '^[0-9]+$' AND u.telegram_id = p_identifier::BIGINT)
      -- login dengan @username (case-insensitive, hapus @ jika ada)
      OR (LOWER(u.username::TEXT) = LOWER(REPLACE(p_identifier, '@', '')))
    )
    AND u.has_web_access = TRUE
    AND u.web_password   IS NOT NULL
    AND u.is_active      = TRUE
    AND u.web_password   = crypt(p_password, u.web_password);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_web_login_v2(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_web_login_v2(TEXT, TEXT) TO authenticated;

-- ── 3. Penambahan Kolom Audit Trail & Alur State Machine pada asset_loans ──
ALTER TABLE public.asset_loans
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_cross_region BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_source_region VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS approved_by_id BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(150) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancelled_by_id BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancelled_by_role VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS force_cancelled_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.asset_loans.is_cross_region IS 'True apabila stok region toko habis dan meminta alokasi lintas wilayah (Cross-Region).';
COMMENT ON COLUMN public.asset_loans.cancellation_reason IS 'Alasan terstruktur untuk laporan bulanan admin saat pengajuan dibatalkan/ditolak.';
COMMENT ON COLUMN public.asset_loans.cancelled_by_role IS 'Role pemakai yang membatalkan (guest, user, atau admin/God Mode).';

-- ============================================================
-- Migration: Tambah Username untuk Web Login
-- TransitTMA — 2026-07-31
-- ============================================================

-- 1. Tambah kolom username ke tabel telegram_users
ALTER TABLE telegram_users
  ADD COLUMN IF NOT EXISTS username VARCHAR(100) DEFAULT NULL;

-- 2. Buat fungsi verifikasi login versi 2 (menerima ID atau Username)
CREATE OR REPLACE FUNCTION public.verify_web_login_v2(
  p_identifier TEXT,
  p_password TEXT
)
RETURNS TABLE(
  telegram_id BIGINT,
  name TEXT,
  username VARCHAR(100),
  role TEXT,
  is_active BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.telegram_id,
    u.name,
    u.username,
    u.role::TEXT,
    u.is_active,
    u.notes,
    u.created_at
  FROM telegram_users u
  WHERE
    (
      -- Cek apakah p_identifier cocok dengan telegram_id (jika p_identifier murni angka)
      (p_identifier ~ '^[0-9]+$' AND u.telegram_id::TEXT = p_identifier)
      OR 
      -- Cek apakah p_identifier cocok dengan username (menghilangkan @ di depannya jika ada)
      (LOWER(u.username) = LOWER(REPLACE(p_identifier, '@', '')))
    )
    AND u.web_password IS NOT NULL
    AND u.has_web_access = TRUE
    AND u.is_active = TRUE
    AND u.web_password = crypt(p_password, u.web_password);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_web_login_v2(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_web_login_v2(TEXT, TEXT) TO authenticated;

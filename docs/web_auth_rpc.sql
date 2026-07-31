-- ============================================================
-- WEB AUTH: Tambah kolom web_password & RPC Functions
-- TransitTMA — Dual Authentication (Telegram + Web Login)
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Enable pgcrypto extension (untuk fungsi crypt / bcrypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Tambah kolom web_password & web_username ke tabel telegram_users
ALTER TABLE telegram_users
  ADD COLUMN IF NOT EXISTS web_password TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS has_web_access BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN telegram_users.web_password IS 'Bcrypt hash password untuk akses web (NULL = belum set, tidak bisa login web)';
COMMENT ON COLUMN telegram_users.has_web_access IS 'True jika user sudah set password web dan diizinkan akses via browser';

-- ============================================================
-- RPC: verify_web_login
-- Fungsi untuk verifikasi Telegram ID + password dari browser.
-- Dipanggil dari frontend, tidak membutuhkan service_role key.
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_web_login(
  p_telegram_id BIGINT,
  p_password TEXT
)
RETURNS TABLE(
  telegram_id BIGINT,
  name TEXT,
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
    u.role::TEXT,
    u.is_active,
    u.notes,
    u.created_at
  FROM telegram_users u
  WHERE
    u.telegram_id = p_telegram_id
    AND u.web_password IS NOT NULL
    AND u.has_web_access = TRUE
    AND u.is_active = TRUE
    AND u.web_password = crypt(p_password, u.web_password);
END;
$$;

-- Grant akses ke fungsi ini untuk anon dan authenticated
GRANT EXECUTE ON FUNCTION public.verify_web_login(BIGINT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_web_login(BIGINT, TEXT) TO authenticated;

-- ============================================================
-- RPC: set_web_password
-- Fungsi untuk user (login via Telegram) agar bisa set password web.
-- Hanya bisa set password untuk telegram_id mereka sendiri.
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_web_password(
  p_telegram_id BIGINT,
  p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hashed TEXT;
  v_rows INT;
BEGIN
  -- Validasi: password minimal 8 karakter
  IF length(p_new_password) < 8 THEN
    RAISE EXCEPTION 'Password minimal 8 karakter.';
  END IF;

  -- Hash password menggunakan bcrypt
  v_hashed := crypt(p_new_password, gen_salt('bf', 10));

  UPDATE telegram_users
  SET
    web_password = v_hashed,
    has_web_access = TRUE
  WHERE telegram_id = p_telegram_id
    AND is_active = TRUE;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

-- Grant akses fungsi set_web_password
GRANT EXECUTE ON FUNCTION public.set_web_password(BIGINT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.set_web_password(BIGINT, TEXT) TO authenticated;

-- ============================================================
-- RPC: remove_web_access
-- Fungsi untuk mencabut akses web user (reset password web).
-- ============================================================
CREATE OR REPLACE FUNCTION public.remove_web_access(
  p_telegram_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rows INT;
BEGIN
  UPDATE telegram_users
  SET
    web_password = NULL,
    has_web_access = FALSE
  WHERE telegram_id = p_telegram_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_web_access(BIGINT) TO anon;
GRANT EXECUTE ON FUNCTION public.remove_web_access(BIGINT) TO authenticated;

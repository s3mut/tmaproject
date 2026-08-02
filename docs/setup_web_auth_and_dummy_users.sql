-- ============================================================
-- DIAGNOSTIC + FIX: Web Auth untuk Dummy Users
-- Jalankan SELURUH script ini di Supabase SQL Editor
-- Aman dijalankan berulang kali (idempotent)
-- ============================================================

-- ─── STEP 1: Pastikan pgcrypto extension aktif ────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── STEP 2: Pastikan kolom web auth sudah ada ───────────────────────────────
ALTER TABLE telegram_users
  ADD COLUMN IF NOT EXISTS username      VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS web_password  TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS has_web_access BOOLEAN     DEFAULT FALSE;

-- ─── STEP 3: Pastikan kolom username bisa diindex / lookup ──────────────────
CREATE INDEX IF NOT EXISTS idx_telegram_users_username
  ON telegram_users(LOWER(username));

-- ─── STEP 4: verify_web_login_v2 — Login via @username atau Telegram ID ──────
DROP FUNCTION IF EXISTS public.verify_web_login_v2(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.verify_web_login_v2(
  p_identifier TEXT,
  p_password   TEXT
)
RETURNS TABLE(
  telegram_id BIGINT,
  name        TEXT,
  username    TEXT,
  role        TEXT,
  is_active   BOOLEAN,
  notes       TEXT,
  created_at  TIMESTAMPTZ
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
    u.created_at::TIMESTAMPTZ
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

-- ─── STEP 5: set_web_password — Set password dari Telegram Mini App ──────────
DROP FUNCTION IF EXISTS public.set_web_password(BIGINT, TEXT);

CREATE OR REPLACE FUNCTION public.set_web_password(
  p_telegram_id  BIGINT,
  p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hashed TEXT;
  v_rows   INT;
BEGIN
  IF length(p_new_password) < 8 THEN
    RAISE EXCEPTION 'Password minimal 8 karakter.';
  END IF;
  v_hashed := crypt(p_new_password, gen_salt('bf', 10));
  UPDATE telegram_users
  SET web_password = v_hashed, has_web_access = TRUE
  WHERE telegram_id = p_telegram_id AND is_active = TRUE;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_web_password(BIGINT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.set_web_password(BIGINT, TEXT) TO authenticated;

-- ─── STEP 6: remove_web_access ───────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.remove_web_access(BIGINT);

CREATE OR REPLACE FUNCTION public.remove_web_access(
  p_telegram_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_rows INT;
BEGIN
  UPDATE telegram_users
  SET web_password = NULL, has_web_access = FALSE
  WHERE telegram_id = p_telegram_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_web_access(BIGINT) TO anon;
GRANT EXECUTE ON FUNCTION public.remove_web_access(BIGINT) TO authenticated;

-- ─── STEP 7: Insert / Update Dummy Users (UPSERT) ────────────────────────────
-- Password semua: password123
-- Login via: @admin_dummy / @user_dummy / @guest_dummy
INSERT INTO telegram_users
  (telegram_id, name, username, role, is_active, has_web_access, web_password)
VALUES
  (10001, 'Admin Dummy', 'admin_dummy', 'admin', TRUE, TRUE,
    crypt('password123', gen_salt('bf', 10))),
  (10002, 'User Dummy',  'user_dummy',  'user',  TRUE, TRUE,
    crypt('password123', gen_salt('bf', 10))),
  (10003, 'Guest Dummy', 'guest_dummy', 'guest', TRUE, TRUE,
    crypt('password123', gen_salt('bf', 10)))
ON CONFLICT (telegram_id) DO UPDATE
SET
  username        = EXCLUDED.username,
  name            = EXCLUDED.name,
  role            = EXCLUDED.role,
  has_web_access  = TRUE,
  web_password    = EXCLUDED.web_password,
  is_active       = TRUE;

-- ─── STEP 8: Reload schema cache PostgREST ───────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ─── STEP 9: VERIFIKASI — Cek apakah login dummy akan berhasil ───────────────
-- Pastikan output menunjukkan ✅ Password Set dan has_web_access = TRUE
SELECT
  telegram_id,
  name,
  username,
  role,
  is_active,
  has_web_access,
  CASE
    WHEN web_password IS NOT NULL THEN '✅ Password Set'
    ELSE '❌ Belum Set'
  END AS web_status,
  -- Test crypt: apakah password123 cocok?
  CASE
    WHEN web_password = crypt('password123', web_password) THEN '✅ Password Cocok'
    ELSE '❌ Password TIDAK Cocok'
  END AS password_check
FROM telegram_users
WHERE telegram_id IN (10001, 10002, 10003)
ORDER BY telegram_id;

-- ─── STEP 10: TEST LOGIN LANGSUNG ────────────────────────────────────────────
-- Jika STEP 9 semua ✅, coba test login function:
SELECT * FROM public.verify_web_login_v2('@admin_dummy', 'password123');
-- Harus mengembalikan 1 baris data user admin_dummy

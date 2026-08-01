-- ============================================================
-- ALL-IN-ONE: Setup Web Auth + Dummy Users untuk TransitTMA
-- Jalankan SELURUH script ini di Supabase SQL Editor
-- Aman dijalankan berulang kali (idempotent)
-- ============================================================

-- ─── LANGKAH 1: Ekstensi pgcrypto (untuk bcrypt hash password) ───────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── LANGKAH 2: Tambahkan kolom Web Auth ke tabel telegram_users ─────────────
ALTER TABLE telegram_users
  ADD COLUMN IF NOT EXISTS username VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS web_password TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS has_web_access BOOLEAN DEFAULT FALSE;

-- ─── LANGKAH 3: Buat/Update fungsi verify_web_login_v2 ───────────────────────
-- Fungsi ini menerima identifier berupa @username atau ID numerik.
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
      (p_identifier ~ '^[0-9]+$' AND u.telegram_id::TEXT = p_identifier)
      OR
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

-- ─── LANGKAH 4: Buat/Update fungsi set_web_password ──────────────────────────
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

-- ─── LANGKAH 5: Insert Akun Dummy (Safe UPSERT) ──────────────────────────────
-- Password untuk ketiga akun: password123
INSERT INTO telegram_users (telegram_id, name, username, role, is_active, has_web_access, web_password)
VALUES
  (10001, 'Admin Dummy', 'admin_dummy', 'admin', TRUE, TRUE, crypt('password123', gen_salt('bf', 10))),
  (10002, 'User Dummy',  'user_dummy',  'user',  TRUE, TRUE, crypt('password123', gen_salt('bf', 10))),
  (10003, 'Guest Dummy', 'guest_dummy', 'guest', TRUE, TRUE, crypt('password123', gen_salt('bf', 10)))
ON CONFLICT (telegram_id) DO UPDATE
SET
  username      = EXCLUDED.username,
  role          = EXCLUDED.role,
  has_web_access = TRUE,
  web_password  = EXCLUDED.web_password,
  is_active     = TRUE;

-- ─── LANGKAH 6: Reload schema cache PostgREST ────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ─── Verifikasi: Cek hasil insert ────────────────────────────────────────────
SELECT telegram_id, name, username, role, is_active, has_web_access,
       CASE WHEN web_password IS NOT NULL THEN '✅ Password Sudah Set' ELSE '❌ Belum Set' END AS web_status
FROM telegram_users
WHERE telegram_id IN (10001, 10002, 10003);

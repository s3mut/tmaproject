-- ==============================================================================
-- TRANSITTMA / E1-TMA: FIX USER MANAGEMENT, RIGHTS & RLS POLICIES
-- Jalankan script ini di Supabase SQL Editor (idempotent / aman diulang)
-- ==============================================================================

-- ── 1. Pastikan ekstensi pgcrypto aktif (untuk hashing bcrypt) ────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 2. Pastikan seluruh kolom pada telegram_users lengkap ──────────────────────
ALTER TABLE public.telegram_users
  ADD COLUMN IF NOT EXISTS username       VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS role           VARCHAR(50)  DEFAULT 'guest',
  ADD COLUMN IF NOT EXISTS assigned_region VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_active      BOOLEAN      DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS web_password   TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS has_web_access BOOLEAN      DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notes          TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS created_at     TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP;

-- Index untuk username lookup cepat
CREATE INDEX IF NOT EXISTS idx_telegram_users_username_lower
  ON public.telegram_users(LOWER(username));

-- ── 3. Perbaiki & Lengkapi RLS Policies pada telegram_users ───────────────────
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;

-- Drop policy lama agar tidak duplikat
DROP POLICY IF EXISTS "Allow public read access on users" ON public.telegram_users;
DROP POLICY IF EXISTS "Allow read users" ON public.telegram_users;
DROP POLICY IF EXISTS "Allow insert users" ON public.telegram_users;
DROP POLICY IF EXISTS "Allow update users" ON public.telegram_users;
DROP POLICY IF EXISTS "Allow delete users" ON public.telegram_users;

-- Berikan izin lengkap CRUD ke telegram_users
CREATE POLICY "Allow read users" ON public.telegram_users
  FOR SELECT USING (true);

CREATE POLICY "Allow insert users" ON public.telegram_users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update users" ON public.telegram_users
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete users" ON public.telegram_users
  FOR DELETE USING (true);

-- ── 4. RPC: admin_upsert_user ────────────────────────────────────────────────
-- Memungkinkan Admin menambah pengguna baru atau memperbarui hak akses user
-- secara aman dari browser maupun TMA dengan bypass RLS (SECURITY DEFINER).
DROP FUNCTION IF EXISTS public.admin_upsert_user(BIGINT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.admin_upsert_user(
  p_telegram_id     BIGINT,
  p_name            TEXT,
  p_username        TEXT,
  p_role            TEXT,
  p_assigned_region TEXT,
  p_is_active       BOOLEAN,
  p_has_web_access  BOOLEAN,
  p_web_password    TEXT,
  p_notes           TEXT
)
RETURNS TABLE(
  telegram_id     BIGINT,
  name            TEXT,
  username        TEXT,
  role            TEXT,
  assigned_region TEXT,
  is_active       BOOLEAN,
  has_web_access  BOOLEAN,
  notes           TEXT,
  created_at      TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hashed_pw TEXT := NULL;
  v_clean_username TEXT := NULL;
  v_clean_region TEXT := NULL;
BEGIN
  -- Bersihkan username (hapus @ dan whitespace)
  IF p_username IS NOT NULL AND TRIM(p_username) <> '' THEN
    v_clean_username := LOWER(REPLACE(TRIM(p_username), '@', ''));
  END IF;

  -- Bersihkan region (jika admin atau 'GLOBAL_ALL', kosongkan region)
  IF p_role = 'admin' OR p_assigned_region = 'GLOBAL_ALL' OR p_assigned_region = '' THEN
    v_clean_region := NULL;
  ELSE
    v_clean_region := TRIM(p_assigned_region);
  END IF;

  -- Proses hash password jika ada password baru yang diberikan
  IF p_web_password IS NOT NULL AND LENGTH(TRIM(p_web_password)) >= 8 THEN
    v_hashed_pw := crypt(TRIM(p_web_password), gen_salt('bf', 10));
  END IF;

  -- Lakukan UPSERT
  INSERT INTO public.telegram_users (
    telegram_id,
    name,
    username,
    role,
    assigned_region,
    is_active,
    has_web_access,
    web_password,
    notes,
    created_at
  )
  VALUES (
    p_telegram_id,
    TRIM(p_name),
    v_clean_username,
    COALESCE(p_role, 'guest')::user_role,
    v_clean_region,
    COALESCE(p_is_active, true),
    COALESCE(p_has_web_access, false),
    v_hashed_pw,
    p_notes,
    NOW()
  )
  ON CONFLICT (telegram_id) DO UPDATE
  SET
    name            = EXCLUDED.name,
    username        = EXCLUDED.username,
    role            = EXCLUDED.role,
    assigned_region = EXCLUDED.assigned_region,
    is_active       = EXCLUDED.is_active,
    has_web_access  = EXCLUDED.has_web_access,
    notes           = EXCLUDED.notes,
    web_password    = CASE 
                        WHEN v_hashed_pw IS NOT NULL THEN v_hashed_pw
                        WHEN EXCLUDED.has_web_access = FALSE THEN NULL
                        ELSE telegram_users.web_password
                      END;

  RETURN QUERY
  SELECT 
    u.telegram_id,
    u.name::TEXT,
    u.username::TEXT,
    u.role::TEXT,
    u.assigned_region::TEXT,
    u.is_active,
    u.has_web_access,
    u.notes::TEXT,
    u.created_at::TIMESTAMPTZ
  FROM public.telegram_users u
  WHERE u.telegram_id = p_telegram_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_user(BIGINT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_user(BIGINT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT) TO authenticated;

-- ── 5. RPC: admin_delete_user ────────────────────────────────────────────────
-- Menghapus user secara aman; jika memiliki riwayat foreign key, otomatis
-- lakukan soft-deactivation (is_active = false) agar relasi database tetap utuh.
DROP FUNCTION IF EXISTS public.admin_delete_user(BIGINT);

CREATE OR REPLACE FUNCTION public.admin_delete_user(
  p_telegram_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_trx_count INT := 0;
  v_opname_count INT := 0;
BEGIN
  -- Cek riwayat transaksi
  SELECT COUNT(*) INTO v_trx_count
  FROM public.asset_transactions
  WHERE requested_by = p_telegram_id
     OR approved_by  = p_telegram_id
     OR dispatched_by = p_telegram_id
     OR received_by  = p_telegram_id;

  -- Cek riwayat stock opname
  SELECT COUNT(*) INTO v_opname_count
  FROM public.stock_opname
  WHERE conducted_by = p_telegram_id;

  IF v_trx_count > 0 OR v_opname_count > 0 THEN
    -- Ada data riwayat -> Soft deactivation
    UPDATE public.telegram_users
    SET is_active = FALSE,
        has_web_access = FALSE,
        notes = COALESCE(notes, '') || ' [DEACTIVATED BY ADMIN]'
    WHERE telegram_id = p_telegram_id;

    RETURN jsonb_build_object(
      'success', true,
      'soft_deleted', true,
      'message', 'Pengguna memiliki riwayat transaksi/audit. Akun berhasil dinonaktifkan (soft delete) untuk menjaga integritas data.'
    );
  ELSE
    -- Tidak ada data riwayat -> Hard delete
    DELETE FROM public.telegram_users
    WHERE telegram_id = p_telegram_id;

    RETURN jsonb_build_object(
      'success', true,
      'soft_deleted', false,
      'message', 'Pengguna berhasil dihapus secara permanen dari database.'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(BIGINT) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(BIGINT) TO authenticated;

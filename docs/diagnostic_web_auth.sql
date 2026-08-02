-- ============================================================
-- DIAGNOSTIC: Cek apakah fungsi login sudah ada, lalu test
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- STEP 1: Cek apakah fungsi verify_web_login_v2 sudah ada
SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('verify_web_login_v2', 'set_web_password', 'remove_web_access');

-- Jika STEP 1 tidak menampilkan baris → fungsi BELUM dibuat
-- Jalankan setup_web_auth_and_dummy_users.sql terlebih dahulu

-- STEP 2: Test langsung fungsi login dengan ID 10001
-- (Harusnya mengembalikan 1 baris jika fungsi ada dan data benar)
SELECT * FROM public.verify_web_login_v2('10001', 'password123');

-- STEP 3: Test login dengan @username
SELECT * FROM public.verify_web_login_v2('@admin_dummy', 'password123');

-- STEP 4: Verifikasi manual bahwa crypt cocok
SELECT
  telegram_id,
  name,
  username,
  has_web_access,
  is_active,
  (web_password = crypt('password123', web_password)) AS password_valid
FROM telegram_users
WHERE telegram_id IN (10001, 10002, 10003);

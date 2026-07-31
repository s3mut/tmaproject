-- ============================================================
-- Seeder: Akun Dummy untuk Testing Web Login
-- Menambahkan 3 akun dengan role berbeda (Admin, User, Guest)
-- Password untuk ketiganya adalah: password123
-- ============================================================

INSERT INTO telegram_users (telegram_id, name, username, role, is_active, has_web_access, web_password)
VALUES 
  (
    10001, 
    'Admin Dummy', 
    'admin_dummy', 
    'admin', 
    TRUE, 
    TRUE, 
    crypt('password123', gen_salt('bf', 10))
  ),
  (
    10002, 
    'User Dummy', 
    'user_dummy', 
    'user', 
    TRUE, 
    TRUE, 
    crypt('password123', gen_salt('bf', 10))
  ),
  (
    10003, 
    'Guest Dummy', 
    'guest_dummy', 
    'guest', 
    TRUE, 
    TRUE, 
    crypt('password123', gen_salt('bf', 10))
  )
ON CONFLICT (telegram_id) DO UPDATE 
SET 
  name = EXCLUDED.name,
  username = EXCLUDED.username,
  role = EXCLUDED.role,
  has_web_access = EXCLUDED.has_web_access,
  web_password = EXCLUDED.web_password;

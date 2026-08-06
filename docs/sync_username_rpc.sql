-- ============================================================
-- SQL: Fungsi RPC untuk Auto-Sync Username Telegram
-- Menghindari error RLS (Row-Level Security) dari client anon
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_telegram_username(
  p_telegram_id BIGINT,
  p_username TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Menjalankan fungsi ini dengan hak akses penuh (bypass RLS client)
AS $$
BEGIN
  UPDATE public.telegram_users
  SET username = p_username
  WHERE telegram_id = p_telegram_id;
END;
$$;

-- Memberikan izin kepada aplikasi (anon) untuk memanggil fungsi ini
GRANT EXECUTE ON FUNCTION public.sync_telegram_username(BIGINT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.sync_telegram_username(BIGINT, TEXT) TO authenticated;

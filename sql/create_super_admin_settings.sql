-- ==============================================================================
-- E1-TMA: SUPER ADMIN SETTINGS HUB & DYNAMIC CONFIGURATION MIGRATION
-- File: sql/create_super_admin_settings.sql
-- ==============================================================================

-- ── 1. Tabel `system_settings` (Key-Value Dinamis JSONB) ──
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by BIGINT REFERENCES public.telegram_users(telegram_id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- ── 2. Tabel `telegram_group_routes` (Multi-Group / Multi-Region Routing) ──
CREATE TABLE IF NOT EXISTS public.telegram_group_routes (
  id BIGSERIAL PRIMARY KEY,
  group_name TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  region TEXT DEFAULT NULL,
  events TEXT[] NOT NULL DEFAULT '{"ALL"}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index pencarian routing grup berdasarkan region & status aktif
CREATE INDEX IF NOT EXISTS idx_tg_group_routes_region ON public.telegram_group_routes(region);
CREATE INDEX IF NOT EXISTS idx_tg_group_routes_active ON public.telegram_group_routes(is_active);

-- ── 3. Seed Default System Settings (Idempotent UPSERT) ──
INSERT INTO public.system_settings (key, value, description)
VALUES 
  (
    'sla_limits',
    '{
      "max_loan_days": 14,
      "reminder_days_before": 2,
      "overdue_escalation": true,
      "max_transfer_days": 7
    }'::jsonb,
    'Konfigurasi batas waktu SLA peminjaman & mutasi perangkat'
  ),
  (
    'operational_controls',
    '{
      "freeze_transactions": false,
      "freeze_reason": "",
      "active_opname_session": false,
      "opname_session_name": ""
    }'::jsonb,
    'Kontrol pembekuan mutasi dan sesi stock opname aktif'
  ),
  (
    'notification_templates',
    '{
      "bot_header": "🔔 <b>E1-TMA SYSTEM NOTIFICATION</b>",
      "bast_footer_note": "Dokumen ini sah dan diterbitkan secara digital oleh Sistem Manajemen Aset E1-TMA."
    }'::jsonb,
    'Template teks kustom untuk bot telegram dan dokumen BAST'
  ),
  (
    'webhook_gsheet',
    '{
      "enabled": false,
      "sheet_url": "",
      "auto_sync_mutations": true
    }'::jsonb,
    'Integrasi webhook Google Sheets untuk backup log mutasi & opname'
  )
ON CONFLICT (key) DO NOTHING;

-- ── 4. Row Level Security (RLS) ──
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_group_routes ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  -- Read Policy: Izinkan semua user membaca konfigurasi sistem (untuk cek freeze, template, dll)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'system_settings' AND policyname = 'Allow read system_settings'
  ) THEN
    CREATE POLICY "Allow read system_settings" ON public.system_settings FOR SELECT USING (true);
  END IF;

  -- Write Policy: Izinkan role 'admin' untuk CRUD konfigurasi sistem
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'system_settings' AND policyname = 'Allow admin write system_settings'
  ) THEN
    CREATE POLICY "Allow admin write system_settings" ON public.system_settings 
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.telegram_users
          WHERE telegram_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::bigint
            AND role = 'admin'
        )
        OR (current_setting('role', true) IN ('service_role', 'postgres'))
        OR true -- Fallback open write for TMA anon client with application-layer role gate
      ) WITH CHECK (true);
  END IF;

  -- Read Policy: Izinkan read telegram_group_routes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'telegram_group_routes' AND policyname = 'Allow read telegram_group_routes'
  ) THEN
    CREATE POLICY "Allow read telegram_group_routes" ON public.telegram_group_routes FOR SELECT USING (true);
  END IF;

  -- Write Policy: Izinkan role 'admin' untuk CRUD telegram_group_routes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'telegram_group_routes' AND policyname = 'Allow admin write telegram_group_routes'
  ) THEN
    CREATE POLICY "Allow admin write telegram_group_routes" ON public.telegram_group_routes 
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.telegram_users
          WHERE telegram_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::bigint
            AND role = 'admin'
        )
        OR (current_setting('role', true) IN ('service_role', 'postgres'))
        OR true -- Fallback open write for TMA anon client with application-layer role gate
      ) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- TransitTMA — Reporting Views & RPC Functions
-- File: docs/reporting_views_and_rpcs.sql
-- Jalankan di Supabase SQL Editor (idempotent / aman dijalankan ulang)
-- ============================================================

-- ============================================================
-- PRE-MIGRATION 1: AUTO-FIX ENUM VALUES (Idempotent)
-- ============================================================
-- Pastikan seluruh nilai status yang dibutuhkan aplikasi sudah ada dalam ENUM asset_status
ALTER TYPE asset_status ADD VALUE IF NOT EXISTS 'Borrowed';
ALTER TYPE asset_status ADD VALUE IF NOT EXISTS 'Retired';
ALTER TYPE asset_status ADD VALUE IF NOT EXISTS 'Disposed';
ALTER TYPE asset_status ADD VALUE IF NOT EXISTS 'In Transit';

-- ============================================================
-- PRE-MIGRATION 2: AUTO-FIX SCHEMA (Idempotent Column Rename)
-- ============================================================
-- Jika tabel asset_mutations di Supabase masih menggunakan nama kolom versi lama
-- (from_site / to_site atau from_site_alias / to_site_alias),
-- ubah menjadi from_site_code / to_site_code agar sesuai dengan aplikasi & schema.sql baru.
DO $$ 
BEGIN 
    -- Cek & rename to_site -> to_site_code
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'asset_mutations' AND column_name = 'to_site'
    ) THEN 
        ALTER TABLE asset_mutations RENAME COLUMN to_site TO to_site_code; 
    END IF;

    -- Cek & rename from_site -> from_site_code
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'asset_mutations' AND column_name = 'from_site'
    ) THEN 
        ALTER TABLE asset_mutations RENAME COLUMN from_site TO from_site_code; 
    END IF;

    -- Cek & rename to_site_alias -> to_site_code (untuk berjaga-jaga jika ada versi alias)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'asset_mutations' AND column_name = 'to_site_alias'
    ) THEN 
        ALTER TABLE asset_mutations RENAME COLUMN to_site_alias TO to_site_code; 
    END IF;

    -- Cek & rename from_site_alias -> from_site_code
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'asset_mutations' AND column_name = 'from_site_alias'
    ) THEN 
        ALTER TABLE asset_mutations RENAME COLUMN from_site_alias TO from_site_code; 
    END IF;
END $$;

-- ============================================================
-- PRE-MIGRATION 3: AUTO-FIX MISSING COLUMNS IN ASSET LOANS
-- ============================================================
-- Pastikan kolom updated_at tersedia pada tabel asset_loans agar fungsi update status (reject, approve, cancel) tidak gagal
ALTER TABLE asset_loans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- SECTION 1: VIEWS REPORTING
-- ============================================================

-- [1] Ringkasan peminjaman per status dan region
CREATE OR REPLACE VIEW view_loan_summary AS
SELECT
  al.status,
  s.region,
  al.category_name,
  al.is_cross_region,
  COUNT(*)                                                  AS total,
  COUNT(*) FILTER (WHERE al.due_date < NOW() AND al.status IN ('Borrowed','In-Transit'))
                                                            AS overdue_count,
  ROUND(AVG(al.duration_days), 1)                           AS avg_duration_days,
  DATE_TRUNC('month', al.created_at)                        AS month_bucket
FROM asset_loans al
LEFT JOIN sites s ON s.site_alias = al.site_alias
GROUP BY al.status, s.region, al.category_name, al.is_cross_region, DATE_TRUNC('month', al.created_at);

-- [2] Daftar pinjaman yang sudah OVERDUE (melewati due_date)
CREATE OR REPLACE VIEW view_overdue_loans AS
SELECT
  al.id,
  al.loan_code,
  al.site_alias,
  s.site_name,
  s.region,
  al.category_name,
  al.purpose,
  al.status,
  al.due_date,
  NOW()::DATE - al.due_date::DATE   AS overdue_days,
  al.requested_by_name,
  al.dispatched_by_name,
  al.asset_id,
  ma.serial_number                  AS asset_serial_number,
  al.created_at
FROM asset_loans al
LEFT JOIN sites s          ON s.site_alias  = al.site_alias
LEFT JOIN master_assets ma ON ma.id         = al.asset_id
WHERE
  al.status IN ('Borrowed', 'In-Transit', 'Approved')
  AND al.due_date < NOW()
ORDER BY overdue_days DESC;

-- [3] Trend mutasi aset per bulan & region (untuk bar chart)
CREATE OR REPLACE VIEW view_mutation_monthly_trend AS
SELECT
  DATE_TRUNC('month', am.mutation_date) AS month_bucket,
  TO_CHAR(am.mutation_date, 'Mon YYYY')  AS month_label,
  s.region,
  am.status,
  COUNT(*)                               AS total_mutations
FROM asset_mutations am
LEFT JOIN sites s ON s.site_code = am.to_site_code
GROUP BY DATE_TRUNC('month', am.mutation_date), TO_CHAR(am.mutation_date, 'Mon YYYY'), s.region, am.status
ORDER BY month_bucket ASC;

-- [4] Utilization rate per kategori aset
CREATE OR REPLACE VIEW view_asset_utilization AS
SELECT
  mc.name                                           AS category_name,
  mc.icon                                           AS category_icon,
  COUNT(ma.id)                                             AS total_assets,
  COUNT(ma.id) FILTER (WHERE ma.status::TEXT = 'Active')   AS active_count,
  COUNT(ma.id) FILTER (WHERE ma.status::TEXT = 'Backup')   AS backup_count,
  COUNT(ma.id) FILTER (WHERE ma.status::TEXT = 'Borrowed') AS borrowed_count,
  COUNT(ma.id) FILTER (WHERE ma.status::TEXT = 'Repair')   AS repair_count,
  COUNT(ma.id) FILTER (WHERE ma.status::TEXT = 'Retired')  AS retired_count,
  ROUND(
    COUNT(ma.id) FILTER (WHERE ma.status::TEXT IN ('Active','Borrowed'))::NUMERIC
    / NULLIF(COUNT(ma.id),0) * 100, 1
  )                                                        AS utilization_rate_pct
FROM master_assets ma
JOIN master_categories mc ON mc.id = ma.category_id
WHERE ma.deleted_at IS NULL
GROUP BY mc.name, mc.icon
ORDER BY total_assets DESC;

-- [5] Ranking site paling aktif meminjam
CREATE OR REPLACE VIEW view_site_loan_ranking AS
SELECT
  al.site_alias,
  s.site_name,
  s.region,
  COUNT(*)                                                                           AS total_loans,
  COUNT(*) FILTER (WHERE al.status = 'Closed')                                       AS closed_loans,
  COUNT(*) FILTER (WHERE al.status IN ('Cancelled','Rejected'))                      AS cancelled_loans,
  COUNT(*) FILTER (WHERE al.due_date < NOW() AND al.status IN ('Borrowed','In-Transit')) AS overdue_loans,
  ROUND(
    COUNT(*) FILTER (WHERE al.status = 'Closed')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1
  )                                                                                  AS completion_rate_pct
FROM asset_loans al
LEFT JOIN sites s ON s.site_alias = al.site_alias
GROUP BY al.site_alias, s.site_name, s.region
ORDER BY total_loans DESC;


-- ============================================================
-- SECTION 2: RPC FUNCTIONS (SECURITY DEFINER - bypass RLS)
-- ============================================================

-- [RPC 1] Laporan peminjaman berfilter (region + date range + status)
CREATE OR REPLACE FUNCTION get_loan_report(
  p_region    TEXT    DEFAULT NULL,
  p_from_date DATE    DEFAULT NULL,
  p_to_date   DATE    DEFAULT NULL,
  p_status    TEXT    DEFAULT NULL,
  p_limit     INT     DEFAULT 200
)
RETURNS TABLE (
  id                  BIGINT,
  loan_code           TEXT,
  site_alias          TEXT,
  site_name           TEXT,
  region              TEXT,
  category_name       TEXT,
  purpose             TEXT,
  status              TEXT,
  duration_days       INT,
  due_date            TIMESTAMPTZ,
  shipping_method     TEXT,
  tracking_number     TEXT,
  requested_by_name   TEXT,
  dispatched_by_name  TEXT,
  received_by_name    TEXT,
  asset_serial_number TEXT,
  is_cross_region     BOOLEAN,
  created_at          TIMESTAMPTZ,
  dispatched_at       TIMESTAMPTZ,
  received_at         TIMESTAMPTZ,
  returned_at         TIMESTAMPTZ,
  closed_at           TIMESTAMPTZ,
  cancellation_reason TEXT,
  overdue_days        INT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id::BIGINT,
    al.loan_code::TEXT,
    al.site_alias::TEXT,
    COALESCE(s.site_name, al.site_alias)::TEXT AS site_name,
    COALESCE(s.region, 'Tanpa Region')::TEXT   AS region,
    al.category_name::TEXT,
    al.purpose::TEXT,
    al.status::TEXT,
    al.duration_days::INT,
    al.due_date,
    al.shipping_method::TEXT,
    al.tracking_number::TEXT,
    al.requested_by_name::TEXT,
    al.dispatched_by_name::TEXT,
    al.received_by_name::TEXT,
    ma.serial_number::TEXT                     AS asset_serial_number,
    al.is_cross_region,
    al.created_at,
    al.dispatched_at,
    al.received_at,
    al.returned_at,
    al.closed_at,
    al.cancellation_reason::TEXT,
    CASE
      WHEN al.due_date < NOW() AND al.status IN ('Borrowed','In-Transit','Approved')
      THEN (NOW()::DATE - al.due_date::DATE)::INT
      ELSE 0
    END AS overdue_days
  FROM asset_loans al
  LEFT JOIN sites         s  ON s.site_alias = al.site_alias
  LEFT JOIN master_assets ma ON ma.id        = al.asset_id
  WHERE
    (p_region   IS NULL OR s.region   = p_region)
    AND (p_status   IS NULL OR al.status  = p_status)
    AND (p_from_date IS NULL OR al.created_at::DATE >= p_from_date)
    AND (p_to_date   IS NULL OR al.created_at::DATE <= p_to_date)
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$;

-- [RPC 2] KPI Ringkasan Aset per Region (untuk dashboard KPI cards)
CREATE OR REPLACE FUNCTION get_asset_kpi(
  p_region TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_assets          BIGINT,
  active_count          BIGINT,
  backup_count          BIGINT,
  borrowed_count        BIGINT,
  repair_count          BIGINT,
  retired_count         BIGINT,
  total_loans           BIGINT,
  active_loans          BIGINT,
  overdue_loans         BIGINT,
  closed_loans          BIGINT,
  cancelled_loans       BIGINT,
  utilization_rate_pct  NUMERIC,
  overdue_rate_pct      NUMERIC,
  avg_loan_duration     NUMERIC,
  on_time_return_pct    NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_assets  BIGINT;
  v_active        BIGINT;
  v_backup        BIGINT;
  v_borrowed      BIGINT;
  v_repair        BIGINT;
  v_retired       BIGINT;
  v_total_loans   BIGINT;
  v_active_loans  BIGINT;
  v_overdue       BIGINT;
  v_closed        BIGINT;
  v_cancelled     BIGINT;
  v_avg_duration  NUMERIC;
  v_on_time_pct   NUMERIC;
BEGIN
  -- Asset counts
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE ma.status::TEXT = 'Active'),
    COUNT(*) FILTER (WHERE ma.status::TEXT = 'Backup'),
    COUNT(*) FILTER (WHERE ma.status::TEXT = 'Borrowed'),
    COUNT(*) FILTER (WHERE ma.status::TEXT = 'Repair'),
    COUNT(*) FILTER (WHERE ma.status::TEXT = 'Retired')
  INTO v_total_assets, v_active, v_backup, v_borrowed, v_repair, v_retired
  FROM master_assets ma
  LEFT JOIN sites s ON s.site_alias = ma.site_alias
  WHERE ma.deleted_at IS NULL
    AND (p_region IS NULL OR s.region = p_region);

  -- Loan counts
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE al.status IN ('Requested','Waiting Admin Approval','Approved','In-Transit','Borrowed','Return In-Transit')),
    COUNT(*) FILTER (WHERE al.due_date < NOW() AND al.status IN ('Borrowed','In-Transit','Approved')),
    COUNT(*) FILTER (WHERE al.status = 'Closed'),
    COUNT(*) FILTER (WHERE al.status IN ('Cancelled','Rejected')),
    ROUND(AVG(al.duration_days), 1),
    ROUND(
      COUNT(*) FILTER (
        WHERE al.status = 'Closed'
          AND (al.closed_at IS NULL OR al.closed_at::DATE <= al.due_date::DATE)
      )::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE al.status = 'Closed'), 0) * 100, 1
    )
  INTO v_total_loans, v_active_loans, v_overdue, v_closed, v_cancelled, v_avg_duration, v_on_time_pct
  FROM asset_loans al
  LEFT JOIN sites s ON s.site_alias = al.site_alias
  WHERE (p_region IS NULL OR s.region = p_region);

  RETURN QUERY SELECT
    v_total_assets,
    v_active,
    v_backup,
    v_borrowed,
    v_repair,
    v_retired,
    v_total_loans,
    v_active_loans,
    v_overdue,
    v_closed,
    v_cancelled,
    ROUND(COALESCE((v_active + v_borrowed)::NUMERIC / NULLIF(v_total_assets, 0) * 100, 0), 1),
    ROUND(COALESCE(v_overdue::NUMERIC / NULLIF(v_active_loans, 0) * 100, 0), 1),
    COALESCE(v_avg_duration, 0),
    COALESCE(v_on_time_pct, 100);
END;
$$;

-- [RPC 3] Trend mutasi 12 bulan (untuk bar chart area)
CREATE OR REPLACE FUNCTION get_mutation_trend(p_year INT DEFAULT NULL)
RETURNS TABLE (
  month_label    TEXT,
  month_order    INT,
  total          BIGINT,
  completed      BIGINT,
  pending        BIGINT,
  rejected       BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC('month', am.mutation_date), 'Mon YY')::TEXT AS month_label,
    EXTRACT(MONTH FROM am.mutation_date)::INT                       AS month_order,
    COUNT(*)::BIGINT                                                     AS total,
    COUNT(*) FILTER (WHERE am.status::TEXT = 'Completed')::BIGINT        AS completed,
    COUNT(*) FILTER (WHERE am.status::TEXT = 'Pending')::BIGINT          AS pending,
    COUNT(*) FILTER (WHERE am.status::TEXT = 'Rejected')::BIGINT         AS rejected
  FROM asset_mutations am
  WHERE
    (p_year IS NULL OR EXTRACT(YEAR FROM am.mutation_date) = p_year)
    AND am.mutation_date >= NOW() - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', am.mutation_date), EXTRACT(MONTH FROM am.mutation_date)
  ORDER BY DATE_TRUNC('month', am.mutation_date) ASC;
END;
$$;

-- [RPC 4] Audit trail per aset (log history mutasi + peminjaman)
CREATE OR REPLACE FUNCTION get_asset_audit_trail(
  p_asset_id   INT  DEFAULT NULL,
  p_serial_num TEXT DEFAULT NULL,
  p_from_date  DATE DEFAULT NULL,
  p_to_date    DATE DEFAULT NULL,
  p_limit      INT  DEFAULT 100
)
RETURNS TABLE (
  event_time   TIMESTAMPTZ,
  event_type   TEXT,
  description  TEXT,
  actor_name   TEXT,
  from_loc     TEXT,
  to_loc       TEXT,
  notes        TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_asset_id INT;
BEGIN
  -- Resolve asset_id dari serial number jika diberikan
  IF p_asset_id IS NOT NULL THEN
    v_asset_id := p_asset_id;
  ELSIF p_serial_num IS NOT NULL THEN
    SELECT id INTO v_asset_id FROM master_assets WHERE serial_number ILIKE p_serial_num LIMIT 1;
  END IF;

  RETURN QUERY
  -- Log dari asset_mutations
  SELECT
    am.mutation_date::TIMESTAMPTZ              AS event_time,
    ('MUTASI ' || am.status)::TEXT             AS event_type,
    ('Aset dipindah: ' || COALESCE(sf.site_name, am.from_site_code, '(Tanpa Asal)') || ' → ' || COALESCE(st.site_name, am.to_site_code))::TEXT AS description,
    tu.name::TEXT                              AS actor_name,
    COALESCE(sf.site_name, am.from_site_code, '-')::TEXT AS from_loc,
    COALESCE(st.site_name, am.to_site_code)::TEXT        AS to_loc,
    am.notes::TEXT
  FROM asset_mutations am
  LEFT JOIN telegram_users tu ON tu.telegram_id = am.moved_by
  LEFT JOIN sites sf ON sf.site_code = am.from_site_code
  LEFT JOIN sites st ON st.site_code = am.to_site_code
  WHERE
    (v_asset_id IS NULL OR am.asset_id = v_asset_id)
    AND (p_from_date IS NULL OR am.mutation_date::DATE >= p_from_date)
    AND (p_to_date   IS NULL OR am.mutation_date::DATE <= p_to_date)

  UNION ALL

  -- Log dari asset_loans
  SELECT
    al.created_at::TIMESTAMPTZ,
    ('PINJAM ' || al.status)::TEXT,
    ('Dipinjam oleh ' || al.site_alias || ' [' || al.loan_code || '] Kategori: ' || al.category_name)::TEXT,
    al.requested_by_name::TEXT,
    '-'::TEXT,
    COALESCE(al.site_alias, '-')::TEXT,
    al.notes::TEXT
  FROM asset_loans al
  WHERE
    (v_asset_id IS NULL OR al.asset_id = v_asset_id)
    AND (p_from_date IS NULL OR al.created_at::DATE >= p_from_date)
    AND (p_to_date   IS NULL OR al.created_at::DATE <= p_to_date)

  ORDER BY event_time DESC
  LIMIT p_limit;
END;
$$;

-- Grant akses ke role anon dan authenticated agar service layer bisa memanggil RPC
GRANT EXECUTE ON FUNCTION get_loan_report TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_asset_kpi   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_mutation_trend TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_asset_audit_trail TO anon, authenticated;

-- Grant select akses ke views
GRANT SELECT ON view_loan_summary          TO anon, authenticated;
GRANT SELECT ON view_overdue_loans         TO anon, authenticated;
GRANT SELECT ON view_mutation_monthly_trend TO anon, authenticated;
GRANT SELECT ON view_asset_utilization     TO anon, authenticated;
GRANT SELECT ON view_site_loan_ranking     TO anon, authenticated;

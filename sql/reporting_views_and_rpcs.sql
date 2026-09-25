-- ==============================================================================
-- TRANSITTMA: REPORTING VIEWS AND RPCS (ANALYTICS & DASHBOARD)
-- Jalankan script ini di Supabase SQL Editor (aman diulang)
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. VIEW: view_overdue_loans
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW view_overdue_loans AS
SELECT 
    l.id,
    l.loan_code,
    l.site_alias,
    s.site_name,
    s.region,
    l.category_name,
    l.purpose,
    l.status,
    l.due_date,
    EXTRACT(DAY FROM (NOW() - l.due_date))::INTEGER AS overdue_days,
    l.requested_by_name,
    l.dispatched_by_name,
    l.asset_id,
    a.serial_number AS asset_serial_number
FROM asset_loans l
LEFT JOIN master_sites s ON s.site_alias = l.site_alias
LEFT JOIN master_assets a ON a.id = l.asset_id
WHERE l.status IN ('Dispatched', 'Received')
  AND l.due_date < NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. VIEW: view_site_loan_ranking
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW view_site_loan_ranking AS
SELECT 
    l.site_alias,
    s.site_name,
    s.region,
    COUNT(*) AS total_loans,
    SUM(CASE WHEN l.status = 'Closed' THEN 1 ELSE 0 END) AS closed_loans,
    SUM(CASE WHEN l.status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_loans,
    SUM(CASE WHEN l.status IN ('Dispatched', 'Received') AND l.due_date < NOW() THEN 1 ELSE 0 END) AS overdue_loans,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((SUM(CASE WHEN l.status = 'Closed' THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)) * 100, 1)
        ELSE 0 
    END AS completion_rate_pct
FROM asset_loans l
LEFT JOIN master_sites s ON s.site_alias = l.site_alias
GROUP BY l.site_alias, s.site_name, s.region
ORDER BY total_loans DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RPC: get_asset_utilization
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_asset_utilization(p_region VARCHAR DEFAULT NULL)
RETURNS TABLE (
    category_name VARCHAR,
    category_icon VARCHAR,
    total_assets BIGINT,
    active_count BIGINT,
    backup_count BIGINT,
    borrowed_count BIGINT,
    repair_count BIGINT,
    retired_count BIGINT,
    utilization_rate_pct NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.category_name::VARCHAR,
        c.icon_name::VARCHAR AS category_icon,
        COUNT(a.id)::BIGINT AS total_assets,
        SUM(CASE WHEN a.status = 'Active' THEN 1 ELSE 0 END)::BIGINT AS active_count,
        SUM(CASE WHEN a.status = 'Backup' THEN 1 ELSE 0 END)::BIGINT AS backup_count,
        SUM(CASE WHEN a.status = 'Borrowed' THEN 1 ELSE 0 END)::BIGINT AS borrowed_count,
        SUM(CASE WHEN a.status = 'Repair' THEN 1 ELSE 0 END)::BIGINT AS repair_count,
        SUM(CASE WHEN a.status IN ('Retired', 'Disposed', 'PENDING_DISPOSAL') THEN 1 ELSE 0 END)::BIGINT AS retired_count,
        CASE 
            WHEN COUNT(a.id) > 0 THEN 
                ROUND(((SUM(CASE WHEN a.status IN ('Active', 'Borrowed') THEN 1 ELSE 0 END)::NUMERIC) / COUNT(a.id)) * 100, 1)
            ELSE 0 
        END AS utilization_rate_pct
    FROM master_categories c
    LEFT JOIN master_assets a ON a.category_id = c.id
    LEFT JOIN master_sites s ON s.site_alias = a.site_alias
    WHERE (p_region IS NULL OR s.region = p_region)
    GROUP BY c.id, c.category_name, c.icon_name
    ORDER BY total_assets DESC;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RPC: get_asset_kpi
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_asset_kpi(p_region VARCHAR DEFAULT NULL)
RETURNS TABLE (
    total_assets BIGINT,
    active_count BIGINT,
    backup_count BIGINT,
    borrowed_count BIGINT,
    repair_count BIGINT,
    retired_count BIGINT,
    total_loans BIGINT,
    active_loans BIGINT,
    overdue_loans BIGINT,
    closed_loans BIGINT,
    cancelled_loans BIGINT,
    utilization_rate_pct NUMERIC,
    overdue_rate_pct NUMERIC,
    avg_loan_duration NUMERIC,
    on_time_return_pct NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_total_assets BIGINT;
    v_active_count BIGINT;
    v_backup_count BIGINT;
    v_borrowed_count BIGINT;
    v_repair_count BIGINT;
    v_retired_count BIGINT;
    
    v_total_loans BIGINT;
    v_active_loans BIGINT;
    v_overdue_loans BIGINT;
    v_closed_loans BIGINT;
    v_cancelled_loans BIGINT;
    
    v_avg_loan_duration NUMERIC;
    v_on_time_return_count BIGINT;
BEGIN
    -- Hitung agregasi Aset
    SELECT 
        COUNT(a.id),
        SUM(CASE WHEN a.status = 'Active' THEN 1 ELSE 0 END),
        SUM(CASE WHEN a.status = 'Backup' THEN 1 ELSE 0 END),
        SUM(CASE WHEN a.status = 'Borrowed' THEN 1 ELSE 0 END),
        SUM(CASE WHEN a.status = 'Repair' THEN 1 ELSE 0 END),
        SUM(CASE WHEN a.status IN ('Retired', 'Disposed', 'PENDING_DISPOSAL') THEN 1 ELSE 0 END)
    INTO 
        v_total_assets, v_active_count, v_backup_count, v_borrowed_count, v_repair_count, v_retired_count
    FROM master_assets a
    LEFT JOIN master_sites s ON s.site_alias = a.site_alias
    WHERE (p_region IS NULL OR s.region = p_region);

    -- Hitung agregasi Pinjaman
    SELECT 
        COUNT(l.id),
        SUM(CASE WHEN l.status IN ('Draft', 'Submitted', 'Approved', 'Dispatched', 'Received') THEN 1 ELSE 0 END),
        SUM(CASE WHEN l.status IN ('Dispatched', 'Received') AND l.due_date < NOW() THEN 1 ELSE 0 END),
        SUM(CASE WHEN l.status = 'Closed' THEN 1 ELSE 0 END),
        SUM(CASE WHEN l.status = 'Cancelled' THEN 1 ELSE 0 END),
        COALESCE(ROUND(AVG(EXTRACT(DAY FROM (COALESCE(l.returned_at, NOW()) - l.created_at)))::NUMERIC, 1), 0),
        SUM(CASE WHEN l.status = 'Closed' AND l.returned_at <= l.due_date THEN 1 ELSE 0 END)
    INTO 
        v_total_loans, v_active_loans, v_overdue_loans, v_closed_loans, v_cancelled_loans, v_avg_loan_duration, v_on_time_return_count
    FROM asset_loans l
    LEFT JOIN master_sites s ON s.site_alias = l.site_alias
    WHERE (p_region IS NULL OR s.region = p_region);

    RETURN QUERY SELECT 
        COALESCE(v_total_assets, 0),
        COALESCE(v_active_count, 0),
        COALESCE(v_backup_count, 0),
        COALESCE(v_borrowed_count, 0),
        COALESCE(v_repair_count, 0),
        COALESCE(v_retired_count, 0),
        COALESCE(v_total_loans, 0),
        COALESCE(v_active_loans, 0),
        COALESCE(v_overdue_loans, 0),
        COALESCE(v_closed_loans, 0),
        COALESCE(v_cancelled_loans, 0),
        
        -- Utilization = (Active + Borrowed) / Total
        CASE WHEN COALESCE(v_total_assets, 0) > 0 THEN 
            ROUND(((COALESCE(v_active_count, 0) + COALESCE(v_borrowed_count, 0))::NUMERIC / v_total_assets) * 100, 1)
        ELSE 0 END,
        
        -- Overdue rate = Overdue / Active Loans
        CASE WHEN COALESCE(v_active_loans, 0) > 0 THEN 
            ROUND((COALESCE(v_overdue_loans, 0)::NUMERIC / v_active_loans) * 100, 1)
        ELSE 0 END,
        
        COALESCE(v_avg_loan_duration, 0),
        
        -- On time return = On-time closed / Total Closed
        CASE WHEN COALESCE(v_closed_loans, 0) > 0 THEN 
            ROUND((COALESCE(v_on_time_return_count, 0)::NUMERIC / v_closed_loans) * 100, 1)
        ELSE 0 END;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RPC: get_mutation_trend
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_mutation_trend(p_year INTEGER DEFAULT NULL)
RETURNS TABLE (
    month_label VARCHAR,
    month_order INTEGER,
    total BIGINT,
    completed BIGINT,
    pending BIGINT,
    rejected BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM NOW()));
BEGIN
    RETURN QUERY
    WITH months AS (
        SELECT generate_series(1, 12) AS m
    )
    SELECT 
        TO_CHAR(TO_DATE(m::text, 'MM'), 'Mon')::VARCHAR AS month_label,
        m::INTEGER AS month_order,
        COUNT(t.id)::BIGINT AS total,
        SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END)::BIGINT AS completed,
        SUM(CASE WHEN t.status IN ('Draft', 'Submitted', 'Pending', 'In Transit') THEN 1 ELSE 0 END)::BIGINT AS pending,
        SUM(CASE WHEN t.status IN ('Rejected', 'Cancelled') THEN 1 ELSE 0 END)::BIGINT AS rejected
    FROM months
    LEFT JOIN asset_transactions t 
        ON EXTRACT(MONTH FROM t.created_at) = m 
        AND EXTRACT(YEAR FROM t.created_at) = v_year
    GROUP BY m
    ORDER BY m;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RPC: get_asset_audit_trail
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_asset_audit_trail(
    p_asset_id BIGINT DEFAULT NULL,
    p_serial_num VARCHAR DEFAULT NULL,
    p_from_date TIMESTAMPTZ DEFAULT NULL,
    p_to_date TIMESTAMPTZ DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    event_time TIMESTAMPTZ,
    event_type VARCHAR,
    description TEXT,
    actor_name VARCHAR,
    from_loc VARCHAR,
    to_loc VARCHAR,
    notes TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.logged_at AS event_time,
        l.event_type::VARCHAR,
        l.document_code::TEXT AS description,
        COALESCE(l.executor_name, 'Sistem')::VARCHAR AS actor_name,
        l.from_site_code::VARCHAR AS from_loc,
        l.to_site_code::VARCHAR AS to_loc,
        l.notes::TEXT
    FROM asset_movement_logs l
    WHERE (p_asset_id IS NULL OR l.asset_id = p_asset_id)
      AND (p_serial_num IS NULL OR l.serial_number ILIKE '%' || p_serial_num || '%')
      AND (p_from_date IS NULL OR l.logged_at >= p_from_date)
      AND (p_to_date IS NULL OR l.logged_at <= p_to_date)
    ORDER BY l.logged_at DESC
    LIMIT p_limit;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RPC: get_loan_report
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_loan_report(
    p_region VARCHAR DEFAULT NULL,
    p_from_date TIMESTAMPTZ DEFAULT NULL,
    p_to_date TIMESTAMPTZ DEFAULT NULL,
    p_status VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 500
)
RETURNS TABLE (
    id BIGINT,
    loan_code VARCHAR,
    site_alias VARCHAR,
    site_name VARCHAR,
    region VARCHAR,
    category_name VARCHAR,
    purpose TEXT,
    status VARCHAR,
    duration_days INTEGER,
    due_date TIMESTAMPTZ,
    shipping_method VARCHAR,
    tracking_number VARCHAR,
    requested_by_name VARCHAR,
    dispatched_by_name VARCHAR,
    received_by_name VARCHAR,
    asset_serial_number VARCHAR,
    is_cross_region BOOLEAN,
    created_at TIMESTAMPTZ,
    dispatched_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    returned_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    overdue_days INTEGER
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.loan_code,
        l.site_alias,
        s.site_name,
        s.region,
        l.category_name,
        l.purpose,
        l.status,
        l.duration_days,
        l.due_date,
        l.shipping_method,
        l.tracking_number,
        l.requested_by_name,
        l.dispatched_by_name,
        l.received_by_name,
        a.serial_number AS asset_serial_number,
        l.is_cross_region,
        l.created_at,
        l.dispatched_at,
        l.received_at,
        l.returned_at,
        l.closed_at,
        l.cancellation_reason,
        CASE WHEN l.status IN ('Dispatched', 'Received') AND l.due_date < NOW() THEN 
            EXTRACT(DAY FROM (NOW() - l.due_date))::INTEGER
        ELSE 0 END AS overdue_days
    FROM asset_loans l
    LEFT JOIN master_sites s ON s.site_alias = l.site_alias
    LEFT JOIN master_assets a ON a.id = l.asset_id
    WHERE (p_region IS NULL OR s.region = p_region)
      AND (p_from_date IS NULL OR l.created_at >= p_from_date)
      AND (p_to_date IS NULL OR l.created_at <= p_to_date)
      AND (p_status IS NULL OR l.status = p_status)
    ORDER BY l.created_at DESC
    LIMIT p_limit;
END;
$$;

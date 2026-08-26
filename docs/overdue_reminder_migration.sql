-- 1. Tambahkan kolom duration_days dan due_date ke tabel asset_transactions
ALTER TABLE asset_transactions 
ADD COLUMN IF NOT EXISTS duration_days INTEGER,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;

-- 2. Perbarui view_overdue_loans agar menggunakan asset_transactions
CREATE OR REPLACE VIEW view_overdue_loans AS
SELECT
  at.id,
  at.transaction_code AS loan_code,
  at.to_site_code AS site_alias,
  s.site_name,
  s.region,
  mc.category_name,
  at.purpose,
  at.status,
  at.due_date,
  (EXTRACT(EPOCH FROM (NOW() - at.due_date)) / 86400)::INTEGER AS overdue_days,
  req_user.name AS requested_by_name,
  dis_user.name AS dispatched_by_name,
  at.asset_id,
  ma.serial_number AS asset_serial_number,
  at.requested_at AS created_at
FROM asset_transactions at
LEFT JOIN sites s ON s.site_code = at.to_site_code
LEFT JOIN master_assets ma ON ma.id = at.asset_id
LEFT JOIN master_categories mc ON mc.id = at.category_id
LEFT JOIN telegram_users req_user ON req_user.telegram_id = at.requested_by
LEFT JOIN telegram_users dis_user ON dis_user.telegram_id = at.dispatched_by
WHERE
  at.transaction_type = 'Borrowing'
  AND at.status IN ('In Progress')
  AND at.due_date < NOW()
ORDER BY overdue_days DESC;

-- Pastikan hak akses view tetap ada
GRANT SELECT ON view_overdue_loans TO anon, authenticated;

import { supabase } from '../lib/supabase';

// ============================================================
// Types untuk Reporting Layer
// ============================================================
export interface LoanReportRow {
  id: number;
  loan_code: string;
  site_alias: string;
  site_name: string;
  region: string;
  category_name: string;
  purpose: string;
  status: string;
  duration_days: number;
  due_date: string;
  shipping_method: string;
  tracking_number: string | null;
  requested_by_name: string;
  dispatched_by_name: string | null;
  received_by_name: string | null;
  asset_serial_number: string | null;
  is_cross_region: boolean;
  created_at: string;
  dispatched_at: string | null;
  received_at: string | null;
  returned_at: string | null;
  closed_at: string | null;
  cancellation_reason: string | null;
  overdue_days: number;
}

export interface AssetKPI {
  total_assets: number;
  active_count: number;
  backup_count: number;
  borrowed_count: number;
  repair_count: number;
  retired_count: number;
  total_loans: number;
  active_loans: number;
  overdue_loans: number;
  closed_loans: number;
  cancelled_loans: number;
  utilization_rate_pct: number;
  overdue_rate_pct: number;
  avg_loan_duration: number;
  on_time_return_pct: number;
}

export interface MutationTrendRow {
  month_label: string;
  month_order: number;
  total: number;
  completed: number;
  pending: number;
  rejected: number;
}

export interface AuditTrailRow {
  event_time: string;
  event_type: string;
  description: string;
  actor_name: string;
  from_loc: string;
  to_loc: string;
  notes: string | null;
}

export interface OverdueLoan {
  id: number;
  loan_code: string;
  site_alias: string;
  site_name: string | null;
  region: string | null;
  category_name: string;
  purpose: string;
  status: string;
  due_date: string;
  overdue_days: number;
  requested_by_name: string;
  dispatched_by_name: string | null;
  asset_id: number | null;
  asset_serial_number: string | null;
}

export interface SiteLoanRankRow {
  site_alias: string;
  site_name: string | null;
  region: string | null;
  total_loans: number;
  closed_loans: number;
  cancelled_loans: number;
  overdue_loans: number;
  completion_rate_pct: number;
}

export interface AssetUtilizationRow {
  category_name: string;
  category_icon: string;
  total_assets: number;
  active_count: number;
  backup_count: number;
  borrowed_count: number;
  repair_count: number;
  retired_count: number;
  utilization_rate_pct: number;
}

export interface ReportFilter {
  region?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  status?: string | null;
  limit?: number;
}

// ============================================================
// Service Functions
// ============================================================

/**
 * Laporan peminjaman berfilter (RPC: get_loan_report)
 */
export async function getLoanReport(filter: ReportFilter = {}): Promise<LoanReportRow[]> {
  const { data, error } = await supabase.rpc('get_loan_report', {
    p_region:    filter.region    ?? null,
    p_from_date: filter.fromDate  ?? null,
    p_to_date:   filter.toDate    ?? null,
    p_status:    filter.status    ?? null,
    p_limit:     filter.limit     ?? 200,
  });

  if (error) throw new Error(`Gagal mengambil laporan peminjaman: ${error.message}`);
  return (data ?? []) as LoanReportRow[];
}

/**
 * KPI Ringkasan Aset & Peminjaman (RPC: get_asset_kpi)
 */
export async function getAssetKPI(region?: string | null): Promise<AssetKPI | null> {
  const { data, error } = await supabase.rpc('get_asset_kpi', {
    p_region: region ?? null,
  });

  if (error) {
    console.warn('get_asset_kpi RPC error (views mungkin belum diinstall):', error.message);
    return null;
  }
  return data?.[0] ?? null;
}

/**
 * Trend mutasi 12 bulan (RPC: get_mutation_trend)
 */
export async function getMutationTrend(year?: number): Promise<MutationTrendRow[]> {
  const { data, error } = await supabase.rpc('get_mutation_trend', {
    p_year: year ?? null,
  });

  if (error) {
    console.warn('get_mutation_trend error:', error.message);
    return [];
  }
  return (data ?? []) as MutationTrendRow[];
}

/**
 * Audit trail per aset (RPC: get_asset_audit_trail)
 */
export async function getAuditTrail(params: {
  assetId?: number | null;
  serialNum?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  limit?: number;
}): Promise<AuditTrailRow[]> {
  const { data, error } = await supabase.rpc('get_asset_audit_trail', {
    p_asset_id:   params.assetId   ?? null,
    p_serial_num: params.serialNum ?? null,
    p_from_date:  params.fromDate  ?? null,
    p_to_date:    params.toDate    ?? null,
    p_limit:      params.limit     ?? 100,
  });

  if (error) {
    console.warn('get_asset_audit_trail error:', error.message);
    return [];
  }
  return (data ?? []) as AuditTrailRow[];
}

/**
 * Daftar pinjaman overdue (dari view_overdue_loans)
 */
export async function getOverdueLoans(): Promise<OverdueLoan[]> {
  const { data, error } = await supabase
    .from('view_overdue_loans')
    .select('*')
    .order('overdue_days', { ascending: false });

  if (error) {
    // Jika view belum dibuat, return array kosong agar app tidak crash
    console.warn('view_overdue_loans tidak tersedia:', error.message);
    return [];
  }
  return (data ?? []) as OverdueLoan[];
}

/**
 * Ranking site berdasarkan volume peminjaman
 */
export async function getSiteRanking(limit = 10): Promise<SiteLoanRankRow[]> {
  const { data, error } = await supabase
    .from('view_site_loan_ranking')
    .select('*')
    .limit(limit);

  if (error) {
    console.warn('view_site_loan_ranking tidak tersedia:', error.message);
    return [];
  }
  return (data ?? []) as SiteLoanRankRow[];
}

/**
 * Utilization rate per kategori aset
 */
export async function getAssetUtilization(region?: string | null): Promise<AssetUtilizationRow[]> {
  // Coba jalankan RPC dengan filter region
  const { data, error } = await supabase.rpc('get_asset_utilization', {
    p_region: region ?? null
  });

  if (error) {
    console.warn('RPC get_asset_utilization gagal/belum ada, fallback ke view:', error.message);
    // Fallback ke view (tanpa filter region)
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('view_asset_utilization')
      .select('*')
      .limit(30);

    if (fallbackError) {
      console.warn('view_asset_utilization tidak tersedia:', fallbackError.message);
      return [];
    }
    return (fallbackData ?? []) as AssetUtilizationRow[];
  }
  
  return (data ?? []) as AssetUtilizationRow[];
}

// ============================================================
// Utility Export Functions
// ============================================================

/**
 * Export array of objects ke CSV UTF-8 BOM (kompatibel Excel Indonesia)
 */
export function exportToCSV(rows: Record<string, any>[], filename: string): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const BOM = '\uFEFF';
  const csvContent =
    BOM +
    [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((h) => {
          const val = row[h] ?? '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        }).join(',')
      ),
    ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format tanggal Indonesia-friendly
 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Hitung overdue days dari due_date (positif = terlambat)
 */
export function calcOverdueDays(dueDate: string): number {
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  return Math.floor((now - due) / (1000 * 60 * 60 * 24));
}

/**
 * Kirim notifikasi overdue ke Telegram Bot
 * Dipanggil dari OverdueAlertModal dengan data yang sudah di-filter
 */
export async function sendOverdueNotificationToBot(params: {
  botToken: string;
  chatId: string;
  overdueLoans: OverdueLoan[];
}): Promise<boolean> {
  if (!params.botToken || !params.chatId) return false;
  if (params.overdueLoans.length === 0) return false;

  const top5 = params.overdueLoans.slice(0, 5);
  const lines = top5.map(
    (l) =>
      `🔴 *${l.loan_code}* — ${l.site_alias} (${l.category_name})\n` +
      `     ⏰ Terlambat *${l.overdue_days} hari* | Status: ${l.status}`
  );

  const message =
    `⚠️ *ALERT: ${params.overdueLoans.length} Pinjaman Overdue!*\n\n` +
    lines.join('\n\n') +
    (params.overdueLoans.length > 5
      ? `\n\n_...dan ${params.overdueLoans.length - 5} lainnya. Buka aplikasi untuk detail._`
      : '') +
    `\n\n_Dikirim otomatis oleh TransitTMA — ${new Date().toLocaleString('id-ID')}_`;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${params.botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: params.chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

import React, { useState, useEffect, useMemo } from 'react';
import { Suspense } from 'react';
import { useReport } from '../hooks/useReport';
import { useAuth } from '../contexts/AuthContext';
import { getLoanReport, exportToCSV } from '../services/reportService';
import type { TransactionDetail, Site, Category } from '../types/inventory';
import OverdueAlertModal from '../components/modals/OverdueAlertModal';
import AuditTrailModal   from '../components/modals/AuditTrailModal';
import LoanReportModal   from '../components/modals/LoanReportModal';
import { LoadingSpinner } from '../components/ui';

const ReportChartsComponent = React.lazy(() => import('../components/charts/ReportCharts'));

// ─── Sub-components ────────────────────────────────────────────────────────────
const KPICard = ({
  icon, label, value, sub, color, trend,
}: {
  icon: string; label: string; value: string | number; sub?: string;
  color: string; trend?: { val: number; positive: boolean } | null;
}) => (
  <div className="glass rounded-2xl p-4 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        <i className={`fas ${icon} text-sm`} />
      </div>
      {trend && (
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
          trend.positive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {trend.positive ? '▲' : '▼'} {Math.abs(trend.val)}%
        </span>
      )}
    </div>
    <div>
      <p className="text-xl font-bold text-slate-50">{value}</p>
      <p className="text-xs font-medium text-slate-300">{label}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const SectionTitle = ({ icon, title, sub }: { icon: string; title: string; sub?: string }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
      <i className={`fas ${icon} text-blue-400 text-xs`} />
    </div>
    <div>
      <h3 className="text-sm font-bold text-slate-50">{title}</h3>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
  </div>
);

// ─── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  onBack: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
  sites?: Site[];
  categories?: Category[];
  transactions?: TransactionDetail[];
}

// ─── Main Component ────────────────────────────────────────────────────────────
type TabKey = 'kpi' | 'loans' | 'audit' | 'utilization';

const ReportView = ({ onBack, onShowToast, sites = [] }: Props) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('kpi');
  const [regionFilter, setRegionFilter] = useState<string>('');

  // Report hook
  const {
    kpi, mutationTrend, overdueLoans, siteRanking, utilization,
    loading, fetchKPI, refetchOverdue,
  } = useReport();

  // Modals
  const [overdueOpen,  setOverdueOpen]  = useState(false);
  const [auditOpen,    setAuditOpen]    = useState(false);
  const [initialAuditFilter, setInitialAuditFilter] = useState<string>('');
  const [loanRptOpen,  setLoanRptOpen]  = useState(false);

  const regions = useMemo(() => Array.from(new Set(sites.map(s => s.region).filter(Boolean))) as string[], [sites]);
  const isAdmin  = currentUser?.role === 'admin';
  const isUser   = currentUser?.role === 'user';
  const isLimited = isUser && !!currentUser?.assigned_region;

  // For IT User with assigned region → lock filter to their region
  const effectiveRegion = isLimited ? (currentUser?.assigned_region ?? '') : regionFilter;

  useEffect(() => {
    fetchKPI(effectiveRegion || null);
  }, [effectiveRegion, fetchKPI]);


  // Pie data: asset status distribution from utilization
  const pieData = useMemo(() => {
    if (!utilization.length) return [];
    const totals = utilization.reduce(
      (acc, u) => ({
        Active:   (acc.Active   ?? 0) + u.active_count,
        Backup:   (acc.Backup   ?? 0) + u.backup_count,
        Borrowed: (acc.Borrowed ?? 0) + u.borrowed_count,
        Repair:   (acc.Repair   ?? 0) + u.repair_count,
        Retired:  (acc.Retired  ?? 0) + u.retired_count,
      }),
      {} as Record<string, number>
    );
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [utilization]);

  // Bar data for mutation trend
  const trendData = useMemo(() =>
    mutationTrend.map(t => ({
      name: t.month_label,
      Selesai: t.completed,
      Pending: t.pending,
      Ditolak: t.rejected,
    })),
    [mutationTrend]
  );

  // Top 5 categories by total
  const topCategories = useMemo(() =>
    [...utilization]
      .sort((a, b) => b.total_assets - a.total_assets)
      .slice(0, 6)
      .map(u => ({
        name: u.category_name.length > 12 ? u.category_name.slice(0, 12) + '…' : u.category_name,
        fullName: u.category_name,
        total: u.total_assets,
        utilPct: u.utilization_rate_pct,
      })),
    [utilization]
  );

  const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: 'kpi',         label: 'KPI',      icon: 'fa-chart-pie' },
    { key: 'loans',       label: 'Pinjaman', icon: 'fa-file-alt'  },
    { key: 'audit',       label: 'Audit',    icon: 'fa-history'   },
    { key: 'utilization', label: 'Aset',     icon: 'fa-boxes'     },
  ];

  return (
    <div className="fade-in space-y-4 pb-24">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-slate-50 transition-colors">
          <i className="fas fa-arrow-left" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-50">Laporan & Analitik</h2>
          <p className="text-xs text-slate-400">
            {isLimited ? `Region: ${currentUser?.assigned_region}` : 'Semua Region'}
          </p>
        </div>
        {/* Overdue alert badge */}
        <button
          onClick={() => setOverdueOpen(true)}
          className="relative w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors"
          title="Alert Overdue"
        >
          <i className="fas fa-bell" />
          {overdueLoans.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {overdueLoans.length > 9 ? '9+' : overdueLoans.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Region Filter (Admin only) ── */}
      {isAdmin && (
        <div className="mb-2">
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="form-input w-full rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500/50 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_12px_center]"
          >
            <option value="">Semua Region</option>
            {regions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Tab Navigation ── */}
      <div className="flex bg-slate-800/60 p-1 rounded-2xl gap-1">
        {TABS.map(t => (
          <button key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === t.key
                ? 'bg-slate-700 text-slate-50 shadow'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <i className={`fas ${t.icon}`} />{t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: KPI */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'kpi' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm"><i className="fas fa-spinner fa-spin mr-2" />Memuat data KPI...</div>
          ) : kpi ? (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 gap-3">
                <KPICard icon="fa-boxes" label="Total Aset" value={kpi.total_assets.toLocaleString()}
                  sub={`${kpi.active_count} active · ${kpi.backup_count} backup`} color="bg-blue-500/20 text-blue-400" />
                <KPICard icon="fa-chart-line" label="Utilization Rate" value={`${kpi.utilization_rate_pct}%`}
                  sub="Aset aktif + dipinjam / total" color="bg-emerald-500/20 text-emerald-400" />
                <KPICard icon="fa-hand-holding-box" label="Overdue Rate" value={`${kpi.overdue_rate_pct}%`}
                  sub={`${kpi.overdue_loans} dari ${kpi.active_loans} aktif`}
                  color={kpi.overdue_rate_pct > 15 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'} />
                <KPICard icon="fa-clock" label="Avg Durasi Pinjam" value={`${kpi.avg_loan_duration} hari`}
                  sub={`On-time return: ${kpi.on_time_return_pct}%`} color="bg-purple-500/20 text-purple-400" />
              </div>

              {/* Loan Summary Row */}
              <div className="glass rounded-2xl p-4">
                <SectionTitle icon="fa-clipboard-list" title="Ringkasan Peminjaman" />
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total Tiket', val: kpi.total_loans, color: 'text-slate-50' },
                    { label: 'Aktif',       val: kpi.active_loans, color: 'text-blue-400' },
                    { label: 'Selesai',     val: kpi.closed_loans, color: 'text-emerald-400' },
                    { label: 'Overdue',     val: kpi.overdue_loans, color: 'text-red-400' },
                    { label: 'Ditolak/Batal', val: kpi.cancelled_loans, color: 'text-slate-400' },
                    { label: 'Repair Aktif', val: kpi.repair_count, color: 'text-amber-400' },
                  ].map(s => (
                    <div key={s.label} className="text-center bg-slate-800/50 rounded-xl py-3">
                      <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                      <p className="text-[10px] text-slate-500">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Suspense fallback={<LoadingSpinner />}>
                <ReportChartsComponent pieData={pieData} siteRanking={siteRanking} trendData={trendData} />
              </Suspense>
            </>
          ) : (
            <div className="glass rounded-2xl p-8 text-center">
              <i className="fas fa-database text-3xl text-slate-600 mb-3 block" />
              <p className="text-slate-400 text-sm">Jalankan <code className="text-blue-400">sql/reporting_views_and_rpcs.sql</code> di Supabase untuk mengaktifkan KPI.</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: LOAN REPORT */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'loans' && (
        <div className="space-y-3">
          <div className="glass rounded-2xl p-5 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto">
              <i className="fas fa-file-alt text-emerald-400 text-2xl" />
            </div>
            <div>
              <h3 className="text-slate-50 font-bold">Generator Laporan Peminjaman</h3>
              <p className="text-sm text-slate-400 mt-1">Filter berdasarkan region, status, dan rentang tanggal. Export ke CSV atau Print PDF.</p>
            </div>
            <button
              onClick={() => setLoanRptOpen(true)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
            >
              <i className="fas fa-chart-bar" /> Buka Generator Laporan
            </button>
          </div>

          {/* Quick export overdue */}
          <div className="glass rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <i className="fas fa-exclamation-triangle text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-50">Laporan Overdue</p>
              <p className="text-xs text-slate-400">{overdueLoans.length} tiket melewati jatuh tempo</p>
            </div>
            <button
              onClick={() => setOverdueOpen(true)}
              className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-semibold transition-all"
            >
              Lihat
            </button>
          </div>

          {/* Retired report (existing) */}
          <div className="glass rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-600/40 flex items-center justify-center">
              <i className="fas fa-power-off text-slate-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-50">Laporan Aset Retired</p>
              <p className="text-xs text-slate-400">Riwayat barang dipensiunkan</p>
            </div>
            <button
              onClick={onBack}
              className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold transition-all"
            >
              Buka ↗
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: AUDIT TRAIL */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'audit' && (
        <div className="space-y-3">
          <div className="glass rounded-2xl p-5 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center mx-auto">
              <i className="fas fa-history text-indigo-400 text-2xl" />
            </div>
            <div>
              <h3 className="text-slate-50 font-bold">Audit Trail Aset</h3>
              <p className="text-sm text-slate-400 mt-1">Lacak seluruh pergerakan aset: mutasi, peminjaman, pengembalian. Cari by Serial Number atau rentang tanggal.</p>
            </div>
            <button
              onClick={() => setAuditOpen(true)}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
            >
              <i className="fas fa-search" /> Buka Audit Trail
            </button>
          </div>

          {/* Quick info cards */}
          {[
            { id: 'MUTASI', icon: 'fa-exchange-alt', color: 'bg-blue-500/20 text-blue-400', title: 'Log Mutasi Aset', sub: 'Perpindahan lokasi antar cabang/region' },
            { id: 'PINJAM', icon: 'fa-hand-holding-box', color: 'bg-purple-500/20 text-purple-400', title: 'Log Peminjaman', sub: 'Peminjaman unit backup per tiket' },
            { id: '', icon: 'fa-pen-to-square', color: 'bg-amber-500/20 text-amber-400', title: 'Semua Log Riwayat', sub: 'Seluruh riwayat aset' },
          ].map(c => (
            <button key={c.title}
              onClick={() => {
                setInitialAuditFilter(c.id);
                setAuditOpen(true);
              }}
              className="w-full text-left glass rounded-xl p-3 flex items-center gap-3 hover:bg-slate-700/50 transition-colors"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.color}`}>
                <i className={`fas ${c.icon} text-sm`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-50">{c.title}</p>
                <p className="text-xs text-slate-500">{c.sub}</p>
              </div>
              <i className="fas fa-chevron-right text-slate-600 text-xs" />
            </button>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: UTILIZATION */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'utilization' && (
        <div className="space-y-4">
          {/* Category Bar Chart */}
          {topCategories.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <SectionTitle icon="fa-chart-bar" title="Top Kategori by Total Aset" sub="6 kategori terbesar" />
              <div className="h-44">
                <Suspense fallback={<div className="p-4 text-center">Memuat grafik...</div>}>
                  <ReportChartsComponent utilizationData={topCategories} />
                </Suspense>
              </div>
            </div>
          )}

          {/* Utilization Table */}
          {utilization.length > 0 && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700/40 flex items-center justify-between">
                <SectionTitle icon="fa-table" title="Tabel Utilization per Kategori" />
                <button
                  onClick={() => exportToCSV(
                    utilization.map(u => ({
                      Kategori: u.category_name, Total: u.total_assets,
                      Active: u.active_count, Backup: u.backup_count,
                      Borrowed: u.borrowed_count, Repair: u.repair_count,
                      Retired: u.retired_count,
                      'Utilization %': u.utilization_rate_pct,
                    })),
                    'Asset_Utilization'
                  )}
                  className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                >
                  <i className="fas fa-download" /> CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-800/50 text-slate-400 text-[11px] uppercase tracking-wider">
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Active</th>
                      <th className="px-4 py-3 text-right">Backup</th>
                      <th className="px-4 py-3 text-right">Borrowed</th>
                      <th className="px-4 py-3 text-right">Repair</th>
                      <th className="px-4 py-3">Util %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {utilization.map((u) => (
                      <tr key={u.category_name} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-slate-50 font-medium">{u.category_name}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-50 font-bold">{u.total_assets.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-emerald-400">{u.active_count}</td>
                        <td className="px-4 py-3 text-right text-blue-400">{u.backup_count}</td>
                        <td className="px-4 py-3 text-right text-purple-400">{u.borrowed_count}</td>
                        <td className="px-4 py-3 text-right text-amber-400">{u.repair_count}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(u.utilization_rate_pct, 100)}%`,
                                  background: u.utilization_rate_pct >= 70 ? '#10b981' : u.utilization_rate_pct >= 40 ? '#f59e0b' : '#ef4444',
                                }}
                              />
                            </div>
                            <span className="text-slate-300 w-10 text-right">{u.utilization_rate_pct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {utilization.length === 0 && !loading && (
            <div className="glass rounded-2xl p-8 text-center">
              <i className="fas fa-database text-3xl text-slate-600 mb-3 block" />
              <p className="text-slate-400 text-sm">Jalankan SQL reporting di Supabase untuk mengaktifkan data utilization.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      <OverdueAlertModal
        isOpen={overdueOpen}
        onClose={() => setOverdueOpen(false)}
        overdueLoans={overdueLoans}
        onRefresh={refetchOverdue}
        onShowToast={onShowToast}
      />
      <AuditTrailModal
        isOpen={auditOpen}
        onClose={() => setAuditOpen(false)}
        onShowToast={onShowToast}
        initialFilterType={initialAuditFilter}
      />
      <LoanReportModal
        isOpen={loanRptOpen}
        onClose={() => setLoanRptOpen(false)}
        onShowToast={onShowToast}
        sites={sites}
        onGenerate={(filter) => getLoanReport({
          region:    filter.region,
          fromDate:  filter.fromDate,
          toDate:    filter.toDate,
          status:    filter.status,
          limit: 500,
        })}
      />
    </div>
  );
};

export default ReportView;

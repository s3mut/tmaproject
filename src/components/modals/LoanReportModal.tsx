import { useState } from 'react';
import type { LoanReportRow } from '../../services/reportService';
import { exportToCSV, fmtDate } from '../../services/reportService';
import type { Site } from '../../types/inventory';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (filter: { region?: string; fromDate?: string; toDate?: string; status?: string }) => Promise<LoanReportRow[]>;
  sites: Site[];
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

const STATUSES = [
  'Requested', 'Waiting Admin Approval', 'Approved',
  'In-Transit', 'Borrowed', 'Return In-Transit',
  'Closed', 'Rejected', 'Cancelled',
];

const LoanReportModal = ({ isOpen, onClose, onGenerate, sites, onShowToast }: Props) => {
  const [region,   setRegion]   = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate,   setToDate]   = useState('');
  const [status,   setStatus]   = useState('');
  const [rows,     setRows]     = useState<LoanReportRow[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [generated, setGenerated] = useState(false);

  const regions = Array.from(new Set(sites.map(s => s.region).filter(Boolean))) as string[];

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setGenerated(true);
    try {
      const data = await onGenerate({ region: region || undefined, fromDate: fromDate || undefined, toDate: toDate || undefined, status: status || undefined });
      setRows(data);
    } catch (e: any) {
      onShowToast?.(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    exportToCSV(
      rows.map((r, i) => ({
        No: i + 1,
        'Loan Code': r.loan_code,
        'Toko (Site)': r.site_alias,
        'Nama Toko': r.site_name,
        Region: r.region,
        Kategori: r.category_name,
        Tujuan: r.purpose,
        Status: r.status,
        'Durasi (Hari)': r.duration_days,
        'Jatuh Tempo': fmtDate(r.due_date),
        'Pengiriman': r.shipping_method,
        'No. Resi': r.tracking_number ?? '-',
        'Diminta Oleh': r.requested_by_name,
        'Dikirim Oleh': r.dispatched_by_name ?? '-',
        'Diterima Oleh': r.received_by_name ?? '-',
        'S/N Unit': r.asset_serial_number ?? '-',
        'Lintas Region': r.is_cross_region ? 'Ya' : 'Tidak',
        'Tgl Request': fmtDate(r.created_at),
        'Tgl Kirim': fmtDate(r.dispatched_at),
        'Tgl Terima': fmtDate(r.received_at),
        'Tgl Kembali': fmtDate(r.returned_at),
        'Tgl Tutup': fmtDate(r.closed_at),
        'Alasan Batal': r.cancellation_reason ?? '-',
        'Overdue (Hari)': r.overdue_days > 0 ? r.overdue_days : '-',
      })),
      `Laporan_Peminjaman${region ? '_' + region : ''}`
    );
    onShowToast?.('📥 Laporan peminjaman berhasil diekspor!', 'success');
  };

  const summary = {
    total: rows.length,
    active: rows.filter(r => ['Borrowed', 'In-Transit', 'Approved'].includes(r.status)).length,
    closed: rows.filter(r => r.status === 'Closed').length,
    overdue: rows.filter(r => r.overdue_days > 0).length,
    crossRegion: rows.filter(r => r.is_cross_region).length,
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      Borrowed: 'text-emerald-400', 'In-Transit': 'text-blue-400', Closed: 'text-slate-400',
      Rejected: 'text-red-400', Cancelled: 'text-slate-500', Requested: 'text-amber-400',
      Approved: 'text-teal-400',
    };
    return map[s] ?? 'text-slate-300';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl bg-slate-900 border border-slate-700/60 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="p-5 border-b border-slate-700/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <i className="fas fa-file-alt text-emerald-400 text-lg" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Laporan Peminjaman</h2>
              <p className="text-xs text-slate-400">Filter & generate laporan komprehensif</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:text-white transition-colors">
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-700/30 space-y-3 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider ml-1">Region</label>
              <select value={region} onChange={e => setRegion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500 mt-1">
                <option value="">Semua Region</option>
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider ml-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500 mt-1">
                <option value="">Semua Status</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider ml-1">Dari Tanggal</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500 mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider ml-1">Sampai Tanggal</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500 mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleGenerate} disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all">
              <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-search'}`} />
              {loading ? 'Memuat...' : 'Generate Laporan'}
            </button>
            {rows.length > 0 && (
              <>
                <button onClick={handleExport}
                  className="px-4 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all">
                  <i className="fas fa-file-csv" /> CSV
                </button>
                <button onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-900 dark:text-white text-xs font-bold flex items-center gap-1.5 transition-all">
                  <i className="fas fa-print" /> Print
                </button>
              </>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        {generated && !loading && (
          <div className="px-4 py-3 border-b border-slate-700/30 grid grid-cols-5 gap-2 shrink-0">
            {[
              { label: 'Total', val: summary.total, color: 'text-slate-900 dark:text-white' },
              { label: 'Aktif', val: summary.active, color: 'text-blue-400' },
              { label: 'Selesai', val: summary.closed, color: 'text-emerald-400' },
              { label: 'Overdue', val: summary.overdue, color: 'text-red-400' },
              { label: 'Lintas Region', val: summary.crossRegion, color: 'text-purple-400' },
            ].map(s => (
              <div key={s.label} className="text-center bg-slate-800/60 rounded-xl py-2">
                <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                <p className="text-[10px] text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm"><i className="fas fa-spinner fa-spin mr-2" />Memuat laporan...</div>
          ) : !generated ? (
            <div className="py-16 text-center">
              <i className="fas fa-chart-bar text-3xl text-slate-600 mb-3 block" />
              <p className="text-slate-500 text-sm">Pilih filter dan klik Generate Laporan</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm"><i className="fas fa-inbox text-2xl opacity-40 mb-2 block" />Tidak ada data dengan filter ini.</div>
          ) : (
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead className="sticky top-0">
                <tr className="bg-slate-800/90 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">Loan Code</th>
                  <th className="px-4 py-3 font-semibold">Toko / Region</th>
                  <th className="px-4 py-3 font-semibold">Kategori</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Durasi</th>
                  <th className="px-4 py-3 font-semibold">Jatuh Tempo</th>
                  <th className="px-4 py-3 font-semibold">Unit S/N</th>
                  <th className="px-4 py-3 font-semibold">Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {rows.map((r) => (
                  <tr key={r.id} className={`hover:bg-white/5 transition-colors ${r.overdue_days > 0 ? 'bg-red-500/5' : ''}`}>
                    <td className="px-4 py-3 font-mono text-blue-400 font-semibold">{r.loan_code}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900 dark:text-white font-medium">{r.site_alias}</p>
                      <p className="text-[10px] text-slate-500">{r.region}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{r.category_name}</td>
                    <td className={`px-4 py-3 font-semibold ${statusBadge(r.status)}`}>{r.status}</td>
                    <td className="px-4 py-3 text-slate-400">{r.duration_days}h</td>
                    <td className="px-4 py-3 text-slate-400">{fmtDate(r.due_date)}</td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">{r.asset_serial_number ?? '-'}</td>
                    <td className="px-4 py-3">
                      {r.overdue_days > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">{r.overdue_days}h</span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800/80">
                  <td colSpan={3} className="px-4 py-2 text-xs text-slate-400 font-semibold">
                    Total: {rows.length} record
                  </td>
                  <td colSpan={5} className="px-4 py-2 text-xs text-slate-500">
                    Avg durasi: {rows.length > 0 ? (rows.reduce((a, b) => a + b.duration_days, 0) / rows.length).toFixed(1) : '-'} hari
                    &nbsp;|&nbsp; Overdue: {summary.overdue} tiket
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoanReportModal;

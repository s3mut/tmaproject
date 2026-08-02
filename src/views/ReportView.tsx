import { useState, useEffect } from 'react';
import { getRetiredReports } from '../services/assetService';
import { useAuth } from '../contexts/AuthContext';

interface ReportRow {
  log_id: number;
  asset_id: number;
  serial_number: string;
  aktiva: string;
  category_name: string;
  brand: string;
  model_type: string;
  site_alias: string;
  notes: string;
  retired_at: string;
  retired_by_id: number;
  retired_by_name: string;
}

interface Props {
  onBack: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

const ReportView = ({ onBack, onShowToast }: Props) => {
  const { currentUser } = useAuth();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'me'>('all');

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const data = await getRetiredReports(filterMode === 'me' ? currentUser?.telegram_id : undefined);
        setReports(data);
      } catch (err: any) {
        onShowToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [filterMode, currentUser]);

  const exportCSV = () => {
    if (reports.length === 0) return;
    const headers = ['No', 'Kategori', 'Serial Number', 'Aktiva', 'Brand', 'Model', 'Lokasi', 'Tanggal Pensiun', 'Diubah Oleh', 'Keterangan'];
    const rows = reports.map((r, i) => [
      i + 1,
      r.category_name,
      r.serial_number,
      r.aktiva || '-',
      r.brand || '-',
      r.model_type || '-',
      r.site_alias || '-',
      new Date(r.retired_at).toLocaleDateString('id-ID'),
      r.retired_by_name,
      r.notes || '-'
    ]);

    const csvContent = [headers.join(',')]
      .concat(rows.map(e => e.map(cell => `"${cell}"`).join(',')))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Aset_Retired_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Laporan berhasil diekspor ke CSV!');
  };

  return (
    <div className="fade-in space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors">
          <i className="fas fa-arrow-left"></i>
        </button>
        <div>
          <h2 className="text-lg font-bold text-white">Laporan Aset Retired</h2>
          <p className="text-xs text-slate-400">Riwayat barang yang dipensiunkan</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex bg-slate-800/50 p-1 rounded-xl">
          <button
            onClick={() => setFilterMode('all')}
            className={`flex-1 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${filterMode === 'all' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
          >
            Semua Data
          </button>
          <button
            onClick={() => setFilterMode('me')}
            className={`flex-1 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${filterMode === 'me' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
          >
            Laporan Saya
          </button>
        </div>
        <button
          onClick={exportCSV}
          disabled={reports.length === 0}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 transition-all"
        >
          <i className="fas fa-file-csv"></i> Export CSV
        </button>
      </div>

      {/* Table Content */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            <i className="fas fa-spinner fa-spin mr-2"></i> Memuat laporan...
          </div>
        ) : reports.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            <i className="fas fa-inbox text-2xl mb-2 opacity-50 block"></i>
            Tidak ada data aset retired.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">No</th>
                  <th className="px-4 py-3 font-semibold">Kategori</th>
                  <th className="px-4 py-3 font-semibold">Serial Number</th>
                  <th className="px-4 py-3 font-semibold">Aktiva</th>
                  <th className="px-4 py-3 font-semibold">Tanggal Pensiun</th>
                  <th className="px-4 py-3 font-semibold">Diubah Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {reports.map((r, i) => (
                  <tr key={r.log_id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-slate-300">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-white">{r.category_name}</td>
                    <td className="px-4 py-3 text-blue-400 font-mono">{r.serial_number}</td>
                    <td className="px-4 py-3 text-slate-300">{r.aktiva || '-'}</td>
                    <td className="px-4 py-3 text-slate-400">{new Date(r.retired_at).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3 text-slate-300">{r.retired_by_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportView;

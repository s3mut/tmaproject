import type { MutationDetail } from '../types/inventory';

interface Props {
  mutations: MutationDetail[];
  loading: boolean;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return 'Baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}h lalu`;
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

const HistoryView = ({ mutations, loading }: Props) => {
  if (loading) {
    return (
      <div className="fade-in text-center py-12">
        <i className="fas fa-spinner fa-spin text-2xl text-blue-400 mb-3 block"></i>
        <p className="text-slate-500 text-sm">Memuat riwayat mutasi...</p>
      </div>
    );
  }

  if (mutations.length === 0) {
    return (
      <div className="fade-in text-center py-12">
        <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-exchange-alt text-3xl text-slate-600"></i>
        </div>
        <p className="text-slate-500 text-sm">Belum ada riwayat mutasi aset</p>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-3">
      {mutations.map((m) => (
        <div key={m.id} className="history-item glass rounded-xl p-4 pl-5 relative">
          <div className="absolute left-0 top-5 w-2 h-2 rounded-full bg-emerald-500 -translate-x-[5px]"></div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {/* Aset info */}
              <p className="text-sm font-semibold text-white truncate">
                {m.asset_brand ? `${m.asset_brand} ` : ''}{m.asset_model_type ?? m.asset_serial_number}
              </p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{m.asset_serial_number}</p>

              {/* From → To */}
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {m.from_site_name ?? m.from_site_code ?? '—'}
                </span>
                <i className="fas fa-arrow-right text-blue-400"></i>
                <span className="text-white bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded">
                  {m.to_site_name ?? m.to_site_code}
                </span>
              </div>

              {/* Moved by + notes */}
              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                <i className="fas fa-user"></i>
                <span>{m.moved_by_name}</span>
                {m.notes && (
                  <>
                    <span>·</span>
                    <span className="italic truncate">{m.notes}</span>
                  </>
                )}
              </div>
            </div>
            <span className="text-xs text-slate-600 flex-shrink-0 mt-0.5">{formatTime(m.mutation_date)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HistoryView;

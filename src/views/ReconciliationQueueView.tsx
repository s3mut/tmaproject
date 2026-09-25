import { useState, useEffect, useCallback } from 'react';
import type { StockReconciliation } from '../types/inventory';
import { getReconciliations } from '../services/opnameService';
import ReconciliationDetailModal from '../components/modals/ReconciliationDetailModal';

interface Props {
  currentUserId: number;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
  onRefreshAssets: () => void;
}

const ReconciliationQueueView = ({ currentUserId, onShowToast, onRefreshAssets }: Props) => {
  const [reconciliations, setReconciliations] = useState<StockReconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecon, setSelectedRecon] = useState<StockReconciliation | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      // Hanya tampilkan yang berstatus Submitted
      const data = await getReconciliations('Submitted');
      setReconciliations(data);
    } catch (err: any) {
      onShowToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return (
    <div className="fade-in space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-300">
          <i className="fas fa-inbox text-blue-400 mr-2"></i>
          Antrean Persetujuan ({reconciliations.length})
        </h2>
        <button onClick={fetchQueue} disabled={loading} className="p-2 text-slate-400 hover:text-white transition-colors">
          <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <i className="fas fa-spinner fa-spin text-3xl text-blue-500 mb-4"></i>
          <p className="text-sm text-slate-400">Memuat antrean rekonsiliasi...</p>
        </div>
      ) : reconciliations.length === 0 ? (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-check-double text-2xl text-slate-400"></i>
          </div>
          <h3 className="text-slate-200 font-semibold mb-1">Semua Selesai!</h3>
          <p className="text-xs text-slate-400">Tidak ada pengajuan rekonsiliasi yang menunggu persetujuan Anda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reconciliations.map(recon => (
            <div
              key={recon.id}
              onClick={() => setSelectedRecon(recon)}
              className="bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-xl p-4 cursor-pointer transition-all active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-xs font-bold text-blue-400 mb-1">{recon.reconciliation_code}</div>
                  <div className="text-[10px] text-slate-400">
                    Diajukan pada: {recon.submitted_at ? new Date(recon.submitted_at).toLocaleString('id-ID') : '-'}
                  </div>
                </div>
                <div className="px-2 py-1 rounded bg-amber-500/20 border border-amber-500/30 text-[10px] font-bold text-amber-400">
                  MENUNGGU PERSETUJUAN
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="bg-slate-900 rounded p-2 border border-slate-700">
                  <div className="text-[10px] text-emerald-400 mb-1">Ditemukan</div>
                  <div className="font-bold text-sm text-slate-200">{recon.variance_summary.found}</div>
                </div>
                <div className="bg-slate-900 rounded p-2 border border-slate-700">
                  <div className="text-[10px] text-red-400 mb-1">Hilang</div>
                  <div className="font-bold text-sm text-slate-200">{recon.variance_summary.missing}</div>
                </div>
                <div className="bg-slate-900 rounded p-2 border border-slate-700">
                  <div className="text-[10px] text-amber-400 mb-1">Nyasar</div>
                  <div className="font-bold text-sm text-slate-200">{recon.variance_summary.misplaced}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRecon && (
        <ReconciliationDetailModal
          isOpen={true}
          onClose={() => setSelectedRecon(null)}
          reconciliation={selectedRecon}
          currentUserId={currentUserId}
          onShowToast={onShowToast}
          onSuccess={() => {
            setSelectedRecon(null);
            fetchQueue();
            onRefreshAssets();
          }}
        />
      )}
    </div>
  );
};

export default ReconciliationQueueView;

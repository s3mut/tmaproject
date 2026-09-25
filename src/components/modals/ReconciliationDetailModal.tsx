import { useState, useEffect } from 'react';
import type { StockReconciliation, StockReconciliationItem, ProposedActionType } from '../../types/inventory';
import { getReconciliationItems, approveReconciliation } from '../../services/opnameService';
import { getSites } from '../../services/siteService';

interface ActionState {
  approvedAction: ProposedActionType;
  correctSiteAlias?: string;
  disposalReason?: string;
  notes?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reconciliation: StockReconciliation;
  currentUserId: number;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
  onSuccess: () => void;
}

const ReconciliationDetailModal = ({ isOpen, onClose, reconciliation, currentUserId, onShowToast, onSuccess }: Props) => {
  const [items, setItems] = useState<StockReconciliationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actions, setActions] = useState<Record<number, ActionState>>({});
  const [sites, setSites] = useState<{ site_alias: string }[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [itemsData, sitesData] = await Promise.all([
          getReconciliationItems(reconciliation.id),
          getSites()
        ]);
        setItems(itemsData);
        setSites(sitesData as { site_alias: string }[]);
        
        // Initialize actions
        const initialActions: Record<number, ActionState> = {};
        itemsData.forEach(item => {
          initialActions[item.id] = {
            approvedAction: item.proposed_action,
            notes: ''
          };
        });
        setActions(initialActions);
      } catch (err: any) {
        onShowToast(err.message, 'error');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isOpen, reconciliation.id, onShowToast, onClose]);

  if (!isOpen) return null;

  const handleActionChange = (itemId: number, field: keyof ActionState, value: string) => {
    setActions(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const handleSubmit = async () => {
    // Validate if CORRECT_LOCATION or PROPOSE_DISPOSAL has required fields
    for (const item of items) {
      const action = actions[item.id];
      if (action.approvedAction === 'CORRECT_LOCATION' && !action.correctSiteAlias) {
        return onShowToast('Harap pilih lokasi baru untuk aset yang Nyasar.', 'error');
      }
      if (action.approvedAction === 'PROPOSE_DISPOSAL' && !action.disposalReason) {
        return onShowToast('Harap isi alasan pemusnahan jika mengusulkan afkir.', 'error');
      }
    }

    if (!window.confirm('Setujui rekonsiliasi dengan tindakan ini? Status dokumen akan berubah menjadi Approved dan tidak dapat diubah lagi.')) return;

    setSubmitting(true);
    try {
      const itemActions = items.map(item => ({
        itemId: item.id,
        approvedAction: actions[item.id].approvedAction,
        correctSiteAlias: actions[item.id].correctSiteAlias,
        disposalReason: actions[item.id].disposalReason,
        notes: actions[item.id].notes
      }));

      await approveReconciliation(reconciliation.id, currentUserId, itemActions);
      onShowToast('Rekonsiliasi berhasil disetujui.', 'success');
      onSuccess();
    } catch (err: any) {
      onShowToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={!submitting ? onClose : undefined}></div>
      <div className="relative bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] flex flex-col slide-up">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/80 rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-slate-50">Keputusan Rekonsiliasi</h3>
            <p className="text-xs text-slate-400">{reconciliation.reconciliation_code}</p>
          </div>
          <button onClick={onClose} disabled={submitting} className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-500/50 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          {loading ? (
            <div className="text-center py-10">
              <i className="fas fa-spinner fa-spin text-3xl text-blue-500 mb-4"></i>
              <p className="text-sm text-slate-400">Memuat rincian aset...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                <div className="text-sm font-semibold text-blue-400 mb-2">Evaluasi Aset Opname</div>
                <p className="text-xs text-slate-400">
                  Tentukan tindakan akhir untuk masing-masing aset yang berstatus <strong>Hilang</strong> atau <strong>Nyasar</strong>. Aset yang <strong>Ditemukan</strong> tidak memerlukan tindakan.
                </p>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.id} className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <span className="text-sm font-bold text-slate-200">S/N: {item.serial_number || `Asset ID: ${item.asset_id}`}</span>
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                        item.opname_status === 'Ditemukan' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        item.opname_status === 'Hilang' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {item.opname_status.toUpperCase()}
                      </span>
                    </div>

                    {item.opname_status !== 'Ditemukan' && actions[item.id] && (
                      <div className="mt-3 space-y-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Pilih Tindakan Akhir:</label>
                          <select
                            value={actions[item.id].approvedAction}
                            onChange={(e) => handleActionChange(item.id, 'approvedAction', e.target.value)}
                            disabled={submitting}
                            className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="NO_ACTION">Abaikan (No Action)</option>
                            <option value="MARK_MISSING">Tandai Aset Hilang (Log Audit)</option>
                            <option value="CORRECT_LOCATION">Koreksi Lokasi ke Cabang Ini</option>
                            <option value="PROPOSE_DISPOSAL">Usulkan Afkir (Rusak Berat)</option>
                          </select>
                        </div>

                        {actions[item.id].approvedAction === 'CORRECT_LOCATION' && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Lokasi yang Benar:</label>
                            <select
                              value={actions[item.id].correctSiteAlias || ''}
                              onChange={(e) => handleActionChange(item.id, 'correctSiteAlias', e.target.value)}
                              disabled={submitting}
                              className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">-- Pilih Lokasi --</option>
                              {sites.map(s => (
                                <option key={s.site_alias} value={s.site_alias}>{s.site_alias}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {actions[item.id].approvedAction === 'PROPOSE_DISPOSAL' && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Alasan Pemusnahan:</label>
                            <input
                              type="text"
                              value={actions[item.id].disposalReason || ''}
                              onChange={(e) => handleActionChange(item.id, 'disposalReason', e.target.value)}
                              disabled={submitting}
                              className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              placeholder="Ketik alasan (contoh: Rusak total saat ditemukan)"
                            />
                          </div>
                        )}
                        
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Catatan Tambahan (Opsional):</label>
                          <input
                            type="text"
                            value={actions[item.id].notes || ''}
                            onChange={(e) => handleActionChange(item.id, 'notes', e.target.value)}
                            disabled={submitting}
                            className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder="Catatan..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/80 rounded-b-2xl flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || loading}
            className="flex-[2] py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check-double" />}
            Setujui & Terapkan Keputusan
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReconciliationDetailModal;

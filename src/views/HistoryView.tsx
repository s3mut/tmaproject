import { useState, useMemo } from 'react';
import type { MutationDetail, AssetDetail, Site } from '../types/inventory';

interface Props {
  mutations: MutationDetail[];
  assets: AssetDetail[];
  sites: Site[];
  loading: boolean;
  onMutate: (assetId: number, fromSiteAlias: string | null, toSiteAlias: string, notes: string) => Promise<void>;
  onApproveMutation: (mutationId: number, assetId: number, toSiteCode: string) => Promise<void>;
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

const HistoryView = ({ mutations, assets, sites, loading, onMutate, onApproveMutation }: Props) => {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null);
  const [toSiteCode, setToSiteCode] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const term = searchQuery.toLowerCase();
    return assets.filter((a) =>
      a.serial_number.toLowerCase().includes(term) ||
      (a.brand ?? '').toLowerCase().includes(term) ||
      (a.model_type ?? '').toLowerCase().includes(term) ||
      (a.computer_name ?? '').toLowerCase().includes(term)
    ).slice(0, 5);
  }, [assets, searchQuery]);

  const availableSites = sites.filter((s) => s.site_alias !== selectedAsset?.site_alias);

  const resetForm = () => {
    setShowForm(false);
    setSearchQuery('');
    setSelectedAsset(null);
    setToSiteCode('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !toSiteCode) return;
    setSubmitting(true);
    try {
      await onMutate(selectedAsset.id, selectedAsset.site_alias ?? null, toSiteCode, notes);
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'form-input w-full rounded-lg px-4 py-3 text-sm';
  const labelCls = 'block text-xs font-medium text-slate-400 mb-1.5';

  return (
    <div className="fade-in space-y-4">
      {/* Tombol Catat Mutasi */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm text-white shadow-lg shadow-blue-500/20"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
        >
          <i className="fas fa-truck-loading"></i>
          Kirim Aset (Mutasi)
        </button>
      )}

      {/* Form Input Mutasi */}
      {showForm && (
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white">
              <i className="fas fa-truck-loading mr-2 text-blue-400"></i>
              Kirim Aset
            </h3>
            <button
              onClick={resetForm}
              className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Step 1: Cari Aset */}
            <div>
              <label className={labelCls}>
                <span className="text-blue-400 mr-1">①</span> Cari Aset <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedAsset(null);
                }}
                className={inputCls}
                placeholder="Ketik S/N, brand, atau model..."
              />
              {searchResults.length > 0 && !selectedAsset && (
                <div className="mt-1 glass rounded-lg overflow-hidden border border-blue-500/20">
                  {searchResults.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-blue-500/10 border-b border-slate-700/50"
                      onClick={() => { setSelectedAsset(a); setSearchQuery(a.serial_number); }}
                    >
                      <p className="text-sm font-medium text-white">{a.brand} {a.model_type}</p>
                      <p className="text-xs text-slate-400 font-mono">{a.serial_number}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Info Aset Terpilih */}
            {selectedAsset && (
              <div className="glass rounded-lg p-3 border border-blue-500/20">
                <p className="text-xs text-slate-400 mb-1">Lokasi saat ini</p>
                <p className="text-sm font-semibold text-emerald-400">
                  {selectedAsset.site_name ?? selectedAsset.site_alias ?? 'Tanpa lokasi'}
                </p>
              </div>
            )}

            {/* Step 3: Site Tujuan */}
            {selectedAsset && (
              <div>
                <label className={labelCls}>
                  <span className="text-blue-400 mr-1">②</span> Site Tujuan <span className="text-red-400">*</span>
                </label>
                <select
                  value={toSiteCode}
                  onChange={(e) => setToSiteCode(e.target.value)}
                  className={inputCls}
                  required
                >
                  <option value="">-- Pilih Site Tujuan --</option>
                  {availableSites.map((s) => (
                    <option key={s.site_code} value={s.site_code}>
                      {s.site_code} - {s.site_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Catatan */}
            {selectedAsset && (
              <div>
                <label className={labelCls}><span className="text-blue-400 mr-1">③</span> Catatan</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={inputCls}
                />
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={resetForm} className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 text-sm">Batal</button>
              <button type="submit" disabled={!selectedAsset || !toSiteCode || submitting} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm">
                {submitting ? 'Mengirim...' : 'Kirim Sekarang'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Riwayat Mutasi */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">
          <i className="fas fa-history mr-2 text-slate-500"></i>
          Daftar Mutasi
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <i className="fas fa-spinner fa-spin text-2xl text-blue-400 mb-3 block"></i>
          </div>
        ) : mutations.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">Belum ada mutasi</div>
        ) : (
          <div className="space-y-3">
            {mutations.map((m) => (
              <div key={m.id} className="glass rounded-xl p-4 relative overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${m.status === 'Pending' ? 'bg-amber-500' : m.status === 'Completed' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <div className="flex items-start justify-between gap-2 pl-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">
                      {m.asset_brand ? `${m.asset_brand} ` : ''}{m.asset_model_type ?? m.asset_serial_number}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{m.from_site_name ?? m.from_site_code ?? '—'}</span>
                      <i className="fas fa-arrow-right text-slate-500"></i>
                      <span className="text-white bg-blue-500/20 px-2 py-0.5 rounded">{m.to_site_name ?? m.to_site_code}</span>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`px-2 py-1 text-[10px] uppercase tracking-wider rounded font-bold ${
                        m.status === 'Pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 
                        m.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
                        'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {m.status === 'Pending' ? 'In Transit' : m.status}
                      </span>
                      {m.status === 'Pending' && (
                        <button
                          onClick={() => onApproveMutation(m.id, m.asset_id, m.to_site_code)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-3 py-1 rounded font-bold shadow-lg shadow-emerald-600/30 transition-colors"
                        >
                          Terima Aset
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs text-slate-500 block mb-1">{formatTime(m.mutation_date)}</span>
                    <span className="text-[10px] text-slate-600 block"><i className="fas fa-user mr-1"></i> {m.moved_by_name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;

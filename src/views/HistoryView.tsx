import { useState, useMemo } from 'react';
import type { MutationDetail, AssetDetail, Site } from '../types/inventory';

interface Props {
  mutations: MutationDetail[];
  assets: AssetDetail[];
  sites: Site[];
  loading: boolean;
  onMutate: (assetId: number, fromSiteAlias: string | null, toSiteAlias: string, notes: string) => Promise<void>;
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

const HistoryView = ({ mutations, assets, sites, loading, onMutate }: Props) => {
  // ── Form state ──
  const [showForm, setShowForm]     = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null);
  const [toSiteAlias, setToSiteAlias] = useState('');
  const [notes, setNotes]           = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Search aset berdasarkan serial number / brand / model
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
    setToSiteAlias('');
    setNotes('');
  };

  const handleSelectAsset = (asset: AssetDetail) => {
    setSelectedAsset(asset);
    setSearchQuery(`${asset.serial_number}`);
    setToSiteAlias('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !toSiteAlias) return;
    setSubmitting(true);
    try {
      await onMutate(selectedAsset.id, selectedAsset.site_alias ?? null, toSiteAlias, notes);
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'form-input w-full rounded-lg px-4 py-3 text-sm';
  const labelCls = 'block text-xs font-medium text-slate-400 mb-1.5';

  return (
    <div className="fade-in space-y-4">

      {/* ── Tombol Catat Mutasi ── */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm text-white"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
        >
          <i className="fas fa-exchange-alt"></i>
          Catat Mutasi / Update Lokasi
        </button>
      )}

      {/* ── Form Input Mutasi ── */}
      {showForm && (
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white">
              <i className="fas fa-exchange-alt mr-2 text-blue-400"></i>
              Catat Mutasi Aset
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
                <span className="text-blue-400 mr-1">①</span> Cari Aset
                <span className="text-red-400 ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedAsset(null);
                  setToSiteAlias('');
                }}
                className={inputCls}
                placeholder="Ketik serial number, brand, atau model..."
                autoComplete="off"
              />
              {/* Dropdown hasil pencarian */}
              {searchResults.length > 0 && !selectedAsset && (
                <div className="mt-1 glass rounded-lg overflow-hidden border border-blue-500/20">
                  {searchResults.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-blue-500/10 border-b border-slate-700/50 last:border-0 transition-colors"
                      onClick={() => handleSelectAsset(a)}
                    >
                      <p className="text-sm font-medium text-white">
                        {a.brand} {a.model_type ?? a.serial_number}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-slate-400 font-mono">{a.serial_number}</p>
                        <span className="text-slate-600">·</span>
                        <p className="text-xs text-slate-500">{a.site_name ?? a.site_alias ?? 'Tanpa lokasi'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchQuery.trim() && searchResults.length === 0 && !selectedAsset && (
                <p className="text-xs text-slate-500 mt-1 pl-1">Aset tidak ditemukan.</p>
              )}
            </div>

            {/* Step 2: Info aset terpilih + lokasi asal */}
            {selectedAsset && (
              <div className="glass rounded-lg p-3 border border-blue-500/20">
                <p className="text-xs text-slate-400 mb-1">Aset terpilih</p>
                <p className="text-sm font-semibold text-white">
                  {selectedAsset.brand} {selectedAsset.model_type ?? selectedAsset.serial_number}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="text-slate-400">Lokasi sekarang:</span>
                  <span className="text-emerald-400 font-medium">
                    {selectedAsset.site_name ?? selectedAsset.site_alias ?? '— Belum ada lokasi —'}
                  </span>
                </div>
              </div>
            )}

            {/* Step 3: Pilih Site Tujuan */}
            {selectedAsset && (
              <div>
                <label className={labelCls}>
                  <span className="text-blue-400 mr-1">②</span> Site Tujuan (Ketik Alias / Kode)
                  <span className="text-red-400 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  value={toSiteAlias}
                  onChange={(e) => setToSiteAlias(e.target.value.toUpperCase())}
                  className={inputCls}
                  placeholder="Contoh: HO1 atau 0999"
                  required
                />
                {toSiteAlias && (
                  <div className="mt-2 text-xs">
                    {(() => {
                      const searchStr = toSiteAlias.trim().toUpperCase();
                      // Cari di SEMUA site, bukan cuma availableSites
                      const matched = sites.find((s) => 
                        s.site_alias?.trim().toUpperCase() === searchStr ||
                        s.site_code?.trim().toUpperCase() === searchStr
                      );
                      
                      if (matched) {
                        // Cek apakah ini site tempat aset sudah berada
                        if (matched.site_alias === selectedAsset.site_alias) {
                          return (
                            <span className="text-orange-400">
                              <i className="fas fa-exclamation-triangle mr-1"></i>
                              Aset sudah berada di lokasi ini ({matched.site_code} - {matched.site_name})
                            </span>
                          );
                        }
                        
                        return (
                          <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <i className="fas fa-check-circle mr-1"></i>
                            <strong>{matched.site_code}</strong> — {matched.site_name} {matched.region ? `(${matched.region})` : ''}
                          </div>
                        );
                      }
                      
                      return (
                        <span className="text-red-400">
                          <i className="fas fa-times-circle mr-1"></i>
                          Site tidak ditemukan
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Catatan */}
            {selectedAsset && (
              <div>
                <label className={labelCls}>
                  <span className="text-blue-400 mr-1">③</span> Catatan (opsional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${inputCls} resize-none`}
                  placeholder="Alasan mutasi, kondisi unit, dll..."
                />
              </div>
            )}

            {/* Tombol Submit */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={
                  !selectedAsset ||
                  !toSiteAlias ||
                  submitting ||
                  !availableSites.find((s) => s.site_alias?.toUpperCase() === toSiteAlias.toUpperCase())
                }
                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting
                  ? <><i className="fas fa-spinner fa-spin"></i> Menyimpan...</>
                  : <><i className="fas fa-exchange-alt"></i> Simpan Mutasi</>
                }
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Riwayat Mutasi ── */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">
          <i className="fas fa-history mr-2 text-slate-500"></i>
          Riwayat Mutasi
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <i className="fas fa-spinner fa-spin text-2xl text-blue-400 mb-3 block"></i>
            <p className="text-slate-500 text-sm">Memuat riwayat mutasi...</p>
          </div>
        ) : mutations.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-exchange-alt text-2xl text-slate-600"></i>
            </div>
            <p className="text-slate-500 text-sm">Belum ada riwayat mutasi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mutations.map((m) => (
              <div key={m.id} className="history-item glass rounded-xl p-4 pl-5 relative">
                <div className="absolute left-0 top-5 w-2 h-2 rounded-full bg-emerald-500 -translate-x-[5px]"></div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">
                      {m.asset_brand ? `${m.asset_brand} ` : ''}{m.asset_model_type ?? m.asset_serial_number}
                    </p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{m.asset_serial_number}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {m.from_site_name ?? m.from_site_code ?? '—'}
                      </span>
                      <i className="fas fa-arrow-right text-blue-400"></i>
                      <span className="text-white bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded">
                        {m.to_site_name ?? m.to_site_code}
                      </span>
                    </div>
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
        )}
      </div>
    </div>
  );
};

export default HistoryView;

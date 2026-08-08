import { useState, useMemo } from 'react';
import type { MutationDetail, AssetDetail, Site } from '../types/inventory';
import { Button, Input, SiteSearchInput, Textarea, SectionHeader, EmptyState } from '../components/ui';
import { MutationBadge } from '../components/ui/Badge';
import QRScannerModal from '../components/modals/QRScannerModal';


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

  // Filter state for the history list
  const [historyFilter, setHistoryFilter] = useState<'all' | 'Pending' | 'Completed' | 'Rejected'>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleScanResult = (scannedText: string) => {
    const trimmed = scannedText.trim().toLowerCase();
    const found = assets.find(
      (a) =>
        a.serial_number.toLowerCase() === trimmed ||
        (a.external_id && a.external_id.toLowerCase() === trimmed)
    );
    if (found) {
      setSelectedAsset(found);
      setSearchQuery(found.serial_number);
      setScannerOpen(false);
    } else {
      setSearchQuery(scannedText.trim());
      setSelectedAsset(null);
      setScannerOpen(false);
    }
  };

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

  const filteredMutations = useMemo(() => {
    let result = mutations;
    if (historyFilter !== 'all') {
      result = result.filter(m => m.status === historyFilter);
    }
    if (historySearch.trim()) {
      const term = historySearch.toLowerCase();
      result = result.filter(m =>
        m.asset_serial_number.toLowerCase().includes(term) ||
        (m.asset_brand ?? '').toLowerCase().includes(term) ||
        (m.asset_model_type ?? '').toLowerCase().includes(term) ||
        (m.from_site_name ?? '').toLowerCase().includes(term) ||
        (m.to_site_name ?? '').toLowerCase().includes(term)
      );
    }
    return result;
  }, [mutations, historyFilter, historySearch]);

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
      const dest = sites.find(s => s.site_alias?.toLowerCase() === toSiteCode.trim().toLowerCase() || s.site_code?.toLowerCase() === toSiteCode.trim().toLowerCase());
      const targetCode = dest ? (dest.site_alias ?? dest.site_code) : toSiteCode.trim().toUpperCase();
      await onMutate(selectedAsset.id, selectedAsset.site_alias ?? null, targetCode, notes);
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in space-y-4">
      {/* Tombol Catat Mutasi */}
      {!showForm && (
        <Button variant="primary" fullWidth size="lg" icon="fa-truck-loading" onClick={() => setShowForm(true)}>
          Kirim Aset (Mutasi)
        </Button>
      )}

      {/* Form Input Mutasi */}
      {showForm && (
        <div className="glass rounded-xl p-5">
          <SectionHeader
            title="Kirim Aset"
            icon="fa-truck-loading"
            action={{ label: '', icon: 'fa-times', onClick: resetForm, variant: 'ghost' }}
            className="mb-4"
          />
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="① Cari Aset" required
              placeholder="Ketik S/N, brand, atau scan barcode..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSelectedAsset(null); }}
              icon="fa-search"
            >
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="text-blue-400 hover:text-blue-300 p-1 transition-colors focus:outline-none flex items-center"
                title="Scan QR / Barcode Aset"
              >
                <i className="fas fa-qrcode text-lg"></i>
              </button>
            </Input>
            {searchResults.length > 0 && !selectedAsset && (
              <div className="mt-1 glass rounded-lg overflow-hidden border border-blue-500/20">
                {searchResults.map((a) => (
                  <button key={a.id} type="button"
                    className="w-full text-left px-4 py-3 hover:bg-blue-500/10 border-b border-slate-700/50"
                    onClick={() => { setSelectedAsset(a); setSearchQuery(a.serial_number); }}
                  >
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{a.brand} {a.model_type}</p>
                    <p className="text-xs text-slate-400 font-mono">{a.serial_number}</p>
                  </button>
                ))}
              </div>
            )}

            {selectedAsset && (
              <div className="glass rounded-lg p-3 border border-blue-500/20">
                <p className="text-xs text-slate-400 mb-1">Lokasi saat ini</p>
                <p className="text-sm font-semibold text-emerald-400">
                  {selectedAsset.site_name ?? selectedAsset.site_alias ?? 'Tanpa lokasi'}
                </p>
              </div>
            )}

            {selectedAsset && (
              <SiteSearchInput
                label="② Site Tujuan (Ketik Alias / Kode)" required
                sites={availableSites}
                value={toSiteCode}
                onChange={(val) => setToSiteCode(val)}
                placeholder="Ketik Site Alias (contoh: CGK-01)..."
              />
            )}

            {selectedAsset && (
              <Textarea label="③ Catatan" rows={2}
                value={notes} onChange={(e) => setNotes(e.target.value)} />
            )}

            <div className="flex gap-3">
              <Button type="button" variant="secondary" fullWidth onClick={resetForm}>Batal</Button>
              <Button type="submit" variant="primary" fullWidth loading={submitting}
                disabled={!selectedAsset || !toSiteCode}>
                Kirim Sekarang
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Riwayat Mutasi */}
      <div>
        <SectionHeader
          title={`Daftar Mutasi${!loading ? ` (${filteredMutations.length}${filteredMutations.length !== mutations.length ? `/${mutations.length}` : ''})` : ''}`}
          icon="fa-history"
          iconColor="text-slate-500"
        />

        {/* Filter + Search */}
        {!loading && mutations.length > 0 && (
          <div className="space-y-2 mb-4">
            {/* Filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {(['all', 'Pending', 'Completed', 'Rejected'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setHistoryFilter(f)}
                  className={`filter-chip flex-shrink-0 ${historyFilter === f ? 'active' : ''}`}
                >
                  {f === 'all' ? 'Semua' : f === 'Pending' ? 'In Transit' : f}
                </button>
              ))}
            </div>
            {/* Search */}
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Cari aset, S/N, atau site..."
                className="form-input w-full pl-8 py-2 text-xs rounded-lg"
              />
              {historySearch && (
                <button
                  onClick={() => setHistorySearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <i className="fas fa-times text-xs"></i>
                </button>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <i className="fas fa-spinner fa-spin text-2xl text-blue-400 mb-3 block" />
          </div>
        ) : filteredMutations.length === 0 ? (
          <EmptyState
            icon="fa-exchange-alt"
            title={mutations.length === 0 ? 'Belum ada mutasi' : 'Tidak ada mutasi sesuai filter'}
          />
        ) : (
          <div className="space-y-3">
            {filteredMutations.map((m) => (
              <div key={m.id} className="glass rounded-xl p-4 relative overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${m.status === 'Pending' ? 'bg-amber-500' : m.status === 'Completed' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <div className="flex items-start justify-between gap-2 pl-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {m.asset_brand ? `${m.asset_brand} ` : ''}{m.asset_model_type ?? m.asset_serial_number}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{m.from_site_name ?? m.from_site_code ?? '—'}</span>
                      <i className="fas fa-arrow-right text-slate-500"></i>
                      <span className="text-white bg-blue-500/20 px-2 py-0.5 rounded">{m.to_site_name ?? m.to_site_code}</span>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-2">
                      <MutationBadge status={m.status === 'Pending' ? 'Pending' : m.status} />
                      {m.status === 'Pending' && (
                        <Button size="sm" variant="success"
                          onClick={() => onApproveMutation(m.id, m.asset_id, m.to_site_code)}>
                          Terima Aset
                        </Button>
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

      {/* QR Scanner Modal untuk Cari Aset */}
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanResult={handleScanResult}
      />
    </div>
  );
};

export default HistoryView;

import { useState, useMemo } from 'react';
import type { AssetDetail, Site, AssetStatus } from '../types/inventory';
import ItemCard from '../components/ItemCard';
import QRScannerModal from '../components/modals/QRScannerModal';
import { SiteSearchInput } from '../components/ui';

interface Props {
  assets: AssetDetail[];
  sites: Site[];
  onBulkStatusChange?: (assetIds: number[], newStatus: AssetStatus, notes: string) => Promise<void>;
}

const OpnameView = ({ assets, sites, onBulkStatusChange }: Props) => {
  const [siteInput, setSiteInput] = useState<string>('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedAssets, setScannedAssets] = useState<AssetDetail[]>([]);
  const [lastScanMsg, setLastScanMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Bulk Status State
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<AssetStatus>('Retired');
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const activeSiteAlias = siteInput.trim();

  // Filter assets by typed site alias (case-insensitive)
  const siteAssets = useMemo(() => {
    if (!activeSiteAlias) return [];
    const query = activeSiteAlias.toLowerCase();
    return assets.filter(
      a => (a.site_alias && a.site_alias.toLowerCase() === query) ||
           (a.full_location_code && a.full_location_code.toLowerCase() === query)
    );
  }, [assets, activeSiteAlias]);

  const totalAssets = siteAssets.length;
  const foundCount  = scannedAssets.length;
  const remaining   = totalAssets - foundCount;
  const progress    = totalAssets > 0 ? Math.round((foundCount / totalAssets) * 100) : 0;

  const handleScanResult = (text: string) => {
    const trimmed = text.trim().toLowerCase();

    // Cari aset di site yang dipilih
    const found = siteAssets.find(
      a => a.serial_number.toLowerCase() === trimmed ||
           (a.external_id && a.external_id.toLowerCase() === trimmed)
    );

    if (!found) {
      setLastScanMsg({ text: `❌ Aset tidak ditemukan di site ini: "${text}"`, ok: false });
      return;
    }
    if (scannedAssets.some(a => a.id === found.id)) {
      setLastScanMsg({ text: `⚠️ Aset sudah discanned: ${found.serial_number}`, ok: false });
      return;
    }

    setScannedAssets(prev => [found, ...prev]);
    setLastScanMsg({ text: `✅ Ditemukan: ${found.brand ?? ''} ${found.serial_number}`, ok: true });
  };

  const resetSession = () => {
    setScannedAssets([]);
    setLastScanMsg(null);
  };

  return (
    <div className="fade-in space-y-4">
      {/* Header Card */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-clipboard-check text-blue-400"></i>
          Sesi Stock Opname
        </h2>

        {/* Input Manual Site Alias */}
        <div className="mb-4">
          <SiteSearchInput
            label="Lokasi Audit (Ketik Site Alias)"
            sites={sites}
            value={siteInput}
            onChange={(val) => {
              setSiteInput(val);
              resetSession();
            }}
            placeholder="Ketik Site Alias (contoh: CGK-01)..."
            disabled={scannerOpen}
            customInfoText={(val) => `Mengaudit aset dengan Site Alias: ${val} (${totalAssets} aset ditemukan)`}
          />
        </div>

        {/* Stats */}
        {activeSiteAlias && (
          <>
            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              <div className="bg-slate-800 rounded-xl p-3">
                <div className="text-xs text-slate-400 mb-1">Total</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalAssets}</div>
              </div>
              <div className="bg-emerald-900/30 rounded-xl p-3 border border-emerald-500/20">
                <div className="text-xs text-emerald-400 mb-1">Ditemukan</div>
                <div className="text-2xl font-bold text-emerald-400">{foundCount}</div>
              </div>
              <div className="bg-amber-900/30 rounded-xl p-3 border border-amber-500/20">
                <div className="text-xs text-amber-400 mb-1">Belum Scan</div>
                <div className="text-2xl font-bold text-amber-400">{remaining}</div>
              </div>
            </div>

            {/* Progress Bar */}
            {totalAssets > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                  <span>Progress Opname</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      background: progress === 100
                        ? 'linear-gradient(90deg, #10b981, #059669)'
                        : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                    }}
                  />
                </div>
                {progress === 100 && (
                  <p className="text-xs text-emerald-400 text-center mt-2 font-semibold">
                    🎉 Semua aset di site ini berhasil ditemukan!
                  </p>
                )}
              </div>
            )}

            {/* Last Scan Message */}
            {lastScanMsg && (
              <div className={`text-xs px-3 py-2.5 rounded-xl mb-3 font-medium ${
                lastScanMsg.ok
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/15 border border-red-500/30 text-red-400'
              }`}>
                {lastScanMsg.text}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <div className="flex gap-2 flex-1">
                <button
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
                  onClick={() => setScannerOpen(true)}
                >
                  <i className="fas fa-qrcode"></i>
                  Scan Aset
                </button>
                {scannedAssets.length > 0 && (
                  <button
                    className="px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium transition-all"
                    onClick={resetSession}
                    title="Reset sesi opname"
                  >
                    <i className="fas fa-redo"></i>
                  </button>
                )}
              </div>
              {scannedAssets.length > 0 && onBulkStatusChange && (
                <button
                  className="py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2"
                  onClick={() => setBulkModalOpen(true)}
                >
                  <i className="fas fa-layer-group"></i>
                  Ubah Status ({scannedAssets.length})
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Daftar Aset Ditemukan */}
      {scannedAssets.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <i className="fas fa-check-circle text-emerald-400"></i>
            Aset Ditemukan
            <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
              {scannedAssets.length}
            </span>
          </h3>
          <div className="space-y-2">
            {scannedAssets.map((asset) => (
              <ItemCard key={asset.id} item={asset} onClick={() => {}} />
            ))}
          </div>
        </div>
      )}

      {/* Belum Scan */}
      {activeSiteAlias && scannedAssets.length > 0 && remaining > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <i className="fas fa-clock text-amber-400"></i>
            Belum Discanned
            <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
              {remaining}
            </span>
          </h3>
          <div className="space-y-2 opacity-60">
            {siteAssets
              .filter(a => !scannedAssets.some(s => s.id === a.id))
              .map((asset) => (
                <ItemCard key={asset.id} item={asset} onClick={() => {}} />
              ))}
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanResult={handleScanResult}
      />

      {/* Bulk Status Modal */}
      {bulkModalOpen && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && !bulkLoading && setBulkModalOpen(false)}>
          <div className="modal-content p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Ubah Status Massal</h2>
            <p className="text-sm text-slate-400 mb-4">
              Anda akan mengubah status untuk <b>{scannedAssets.length} aset</b> sekaligus.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Status Baru</label>
                <select 
                  className="form-input w-full"
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value as any)}
                  disabled={bulkLoading}
                >
                  <option value="Active">Active</option>
                  <option value="Backup">Backup</option>
                  <option value="Repair">Repair</option>
                  <option value="Retired">Retired (Pensiun)</option>
                  <option value="Disposed">Disposed</option>
                  <option value="In Transit">In Transit</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Keterangan / Alasan</label>
                <input 
                  type="text" 
                  className="form-input w-full"
                  placeholder="Opsional..."
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  disabled={bulkLoading}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  onClick={() => setBulkModalOpen(false)}
                  disabled={bulkLoading}
                  className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium text-sm"
                >
                  Batal
                </button>
                <button 
                  onClick={async () => {
                    if (!onBulkStatusChange) return;
                    setBulkLoading(true);
                    try {
                      await onBulkStatusChange(scannedAssets.map(a => a.id), bulkStatus, bulkNotes);
                      setBulkModalOpen(false);
                      setScannedAssets([]);
                      setLastScanMsg({ text: `✅ Berhasil mengubah status ${scannedAssets.length} aset menjadi ${bulkStatus}.`, ok: true });
                    } catch (err: any) {
                      alert(err.message);
                    } finally {
                      setBulkLoading(false);
                    }
                  }}
                  disabled={bulkLoading}
                  className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-medium text-sm shadow-lg shadow-orange-500/30 disabled:opacity-50"
                >
                  {bulkLoading ? <i className="fas fa-spinner fa-spin"></i> : 'Proses'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpnameView;

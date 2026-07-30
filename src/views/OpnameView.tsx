import { useState } from 'react';
import type { AssetDetail, Site } from '../types/inventory';
import ItemCard from '../components/ItemCard';

interface Props {
  assets: AssetDetail[];
  sites: Site[];
}

const OpnameView = ({ assets, sites }: Props) => {
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [scannedAssets, setScannedAssets] = useState<AssetDetail[]>([]);

  // Filter assets by selected site
  const siteAssets = assets.filter(a => a.site_alias === selectedSite);

  // Stats for the opname
  const totalAssets = siteAssets.length;
  const foundAssets = scannedAssets.length;
  const missingAssets = totalAssets - foundAssets;

  const handleSimulateScan = () => {
    if (!selectedSite || siteAssets.length === 0) return;
    
    // Simulate finding a random asset that hasn't been scanned yet
    const remaining = siteAssets.filter(a => !scannedAssets.some(sa => sa.id === a.id));
    if (remaining.length > 0) {
      const asset = remaining[Math.floor(Math.random() * remaining.length)];
      setScannedAssets(prev => [asset, ...prev]);
    }
  };

  return (
    <div className="fade-in space-y-4">
      <div className="card p-4">
        <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
          <i className="fas fa-clipboard-check text-blue-400"></i>
          Sesi Stock Opname
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Pilih Lokasi Audit
            </label>
            <select
              className="form-input"
              value={selectedSite}
              onChange={(e) => {
                setSelectedSite(e.target.value);
                setScannedAssets([]); // reset on site change
              }}
              disabled={scanning}
            >
              <option value="">-- Pilih Site --</option>
              {sites.map((s) => (
                <option key={s.site_code} value={s.site_alias ?? s.site_code}>
                  {s.site_name}
                </option>
              ))}
            </select>
          </div>

          {selectedSite && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-800 rounded-lg p-2">
                <div className="text-xs text-slate-400">Total</div>
                <div className="text-lg font-bold text-slate-200">{totalAssets}</div>
              </div>
              <div className="bg-emerald-900/30 rounded-lg p-2 border border-emerald-500/20">
                <div className="text-xs text-emerald-400">Ditemukan</div>
                <div className="text-lg font-bold text-emerald-400">{foundAssets}</div>
              </div>
              <div className="bg-red-900/30 rounded-lg p-2 border border-red-500/20">
                <div className="text-xs text-red-400">Sisa</div>
                <div className="text-lg font-bold text-red-400">{missingAssets}</div>
              </div>
            </div>
          )}

          {selectedSite && !scanning && (
            <button
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors"
              onClick={() => setScanning(true)}
            >
              <i className="fas fa-qrcode mr-2"></i> Mulai Scan Barcode
            </button>
          )}

          {scanning && (
            <div className="space-y-3">
              <div className="bg-slate-800 p-6 rounded-xl border-2 border-dashed border-blue-500/50 text-center">
                <i className="fas fa-camera text-4xl text-slate-500 mb-3 animate-pulse"></i>
                <p className="text-slate-300 text-sm">Kamera Aktif...</p>
                <p className="text-slate-500 text-xs mt-1">Arahkan ke QR/Barcode Aset</p>
                
                <button
                  className="mt-4 px-4 py-2 bg-slate-700 text-sm rounded-lg text-slate-300"
                  onClick={handleSimulateScan}
                >
                  [Simulasi Scan Asset]
                </button>
              </div>
              
              <button
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors"
                onClick={() => setScanning(false)}
              >
                Jeda Scan
              </button>
            </div>
          )}
        </div>
      </div>

      {scannedAssets.length > 0 && (
        <div className="space-y-3 mt-6">
          <h3 className="text-sm font-bold text-slate-300 flex items-center justify-between">
            <span>Aset Ditemukan ({scannedAssets.length})</span>
          </h3>
          <div className="space-y-2">
            {scannedAssets.map((asset) => (
              <ItemCard key={asset.id} item={asset} onClick={() => {}} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OpnameView;

import { useState, useMemo } from 'react';
import type { AssetDetail, Site, StockOpname } from '../types/inventory';
import ItemCard from '../components/ItemCard';
import QRScannerModal from '../components/modals/QRScannerModal';
import { SiteSearchInput } from '../components/ui';
import {
  createOpnameSession,
  addOpnameScan,
  closeOpnameSession,
  createReconciliationDraft,
  submitReconciliation
} from '../services/opnameService';

interface Props {
  assets: AssetDetail[];
  sites: Site[];
  lockedAssetIds?: Set<number>;
  currentUserId: number;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
  onRefreshAssets: () => void;
}

const OpnameView = ({ assets, sites, lockedAssetIds = new Set(), currentUserId, onShowToast, onRefreshAssets }: Props) => {
  const [siteInput, setSiteInput] = useState<string>('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedAssets, setScannedAssets] = useState<AssetDetail[]>([]);
  const [lastScanMsg, setLastScanMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Opname Session State
  const [session, setSession] = useState<StockOpname | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualSN, setManualSN] = useState('');

  const activeSiteAlias = siteInput.trim();

  // Aset untuk site yang dipilih
  const allSiteAssets = useMemo(() => {
    if (!activeSiteAlias) return [];
    const query = activeSiteAlias.toLowerCase();
    return assets.filter(
      a => (a.site_alias && a.site_alias.toLowerCase() === query) ||
           (a.full_location_code && a.full_location_code.toLowerCase() === query)
    );
  }, [assets, activeSiteAlias]);

  // Pisahkan aset yang terkunci (dalam transaksi) agar tidak perlu di-opname
  const { siteAssets, lockedCount } = useMemo(() => {
    const valid: AssetDetail[] = [];
    let locked = 0;
    for (const a of allSiteAssets) {
      if (lockedAssetIds.has(a.id)) {
        locked++;
      } else {
        valid.push(a);
      }
    }
    return { siteAssets: valid, lockedCount: locked };
  }, [allSiteAssets, lockedAssetIds]);

  const totalAssets = siteAssets.length;
  const foundCount  = scannedAssets.length;
  const remaining   = totalAssets - foundCount;
  const progress    = totalAssets > 0 ? Math.round((foundCount / totalAssets) * 100) : 0;

  const handleStartSession = async () => {
    if (!activeSiteAlias) return;
    setLoading(true);
    try {
      const newSession = await createOpnameSession(activeSiteAlias, currentUserId, 'Opname Reguler');
      setSession(newSession);
      setScannedAssets([]);
      setLastScanMsg(null);
      onShowToast('Sesi opname berhasil dimulai!', 'success');
    } catch (err: any) {
      onShowToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleScanResult = async (text: string) => {
    if (!session) return;
    const trimmed = text.trim().toLowerCase();

    // Cari aset di database global
    const foundGlobal = assets.find(
      a => a.serial_number.toLowerCase() === trimmed ||
           (a.external_id && a.external_id.toLowerCase() === trimmed)
    );

    if (!foundGlobal) {
      setLastScanMsg({ text: `❌ Aset tidak ditemukan di database: "${text}"`, ok: false });
      return;
    }

    if (scannedAssets.some(a => a.id === foundGlobal.id)) {
      setLastScanMsg({ text: `⚠️ Aset sudah discanned: ${foundGlobal.serial_number}`, ok: false });
      return;
    }

    // Tentukan status opname
    let status: 'Ditemukan' | 'Nyasar' = 'Ditemukan';
    const isBelongsToSite = siteAssets.some(a => a.id === foundGlobal.id);
    if (!isBelongsToSite) {
      status = 'Nyasar';
    }

    setLoading(true);
    try {
      await addOpnameScan(session.id, foundGlobal.id, status, `Scan otomatis via UI (${status})`);
      setScannedAssets(prev => [foundGlobal, ...prev]);
      setLastScanMsg({ 
        text: status === 'Ditemukan' 
          ? `✅ Ditemukan: ${foundGlobal.brand ?? ''} ${foundGlobal.serial_number}` 
          : `⚠️ Nyasar: Aset dari site lain (${foundGlobal.site_alias ?? 'Unknown'})`, 
        ok: status === 'Ditemukan' 
      });
    } catch (err: any) {
      setLastScanMsg({ text: `❌ Gagal menyimpan scan: ${err.message}`, ok: false });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReconciliation = async () => {
    if (!session) return;
    if (!window.confirm('Selesai opname dan ajukan rekonsiliasi ke Super Admin?')) return;

    setLoading(true);
    try {
      // 1. Catat semua aset yang 'Hilang'
      const missingAssets = siteAssets.filter(a => !scannedAssets.some(s => s.id === a.id));
      for (const missing of missingAssets) {
        await addOpnameScan(session.id, missing.id, 'Hilang', 'Otomatis: Tidak discan saat sesi opname selesai');
      }

      // 2. Tutup Sesi
      await closeOpnameSession(session.id);

      // 3. Buat Draft Rekonsiliasi
      const draft = await createReconciliationDraft(session.id, session.site_alias, currentUserId);

      // 4. Submit Rekonsiliasi (Locked)
      await submitReconciliation(draft.id, currentUserId);

      onShowToast('✅ Rekonsiliasi berhasil diajukan ke Super Admin.', 'success');
      setSession(null);
      setScannedAssets([]);
      setLastScanMsg(null);
      setSiteInput('');
      onRefreshAssets();
    } catch (err: any) {
      onShowToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetSessionLocally = () => {
    if (session && !window.confirm('Batalkan sesi opname ini? Data scan belum diajukan akan hilang.')) return;
    setSession(null);
    setScannedAssets([]);
    setLastScanMsg(null);
  };

  return (
    <div className="fade-in space-y-4">
      {/* Header Card */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-base font-bold text-slate-50 mb-4 flex items-center gap-2">
          <i className="fas fa-clipboard-check text-blue-400"></i>
          Sesi Stock Opname
        </h2>

        {/* Input Manual Site Alias */}
        {!session && (
          <div className="mb-4">
            <SiteSearchInput
              label="Lokasi Cabang (Site Alias)"
              sites={sites}
              value={siteInput}
              onChange={(val) => {
                setSiteInput(val);
                setScannedAssets([]);
                setLastScanMsg(null);
              }}
              placeholder="Ketik kode atau alias site..."
              disabled={scannerOpen || loading}
              customInfoText={(val) => `Mengaudit aset dengan Site Alias: ${val} (${totalAssets} aset ditemukan)`}
            />
            {activeSiteAlias && (
              <button
                onClick={handleStartSession}
                disabled={loading || totalAssets === 0}
                className="mt-3 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-play" />}
                Mulai Sesi Opname
              </button>
            )}
          </div>
        )}

        {/* Info Sesi Aktif */}
        {session && (
          <div className="mb-4 rounded-xl p-3 bg-blue-500/10 border border-blue-500/30 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-300 font-semibold">Sesi Aktif: {session.site_alias}</p>
              <p className="text-[10px] text-blue-400/80">ID: {session.id} • Dimulai: {new Date(session.start_date).toLocaleTimeString('id-ID')}</p>
            </div>
            <button onClick={resetSessionLocally} className="text-xs text-red-400 hover:text-red-300 underline p-1">Batalkan</button>
          </div>
        )}

        {/* Stats */}
        {activeSiteAlias && session && (
          <>
            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              <div className="bg-slate-800 rounded-xl p-3">
                <div className="text-xs text-slate-400 mb-1">Total Target</div>
                <div className="text-2xl font-bold text-slate-50">{totalAssets}</div>
              </div>
              <div className="bg-emerald-900/30 rounded-xl p-3 border border-emerald-500/20">
                <div className="text-xs text-emerald-400 mb-1">Discanned</div>
                <div className="text-2xl font-bold text-emerald-400">{foundCount}</div>
              </div>
              <div className="bg-amber-900/30 rounded-xl p-3 border border-amber-500/20">
                <div className="text-xs text-amber-400 mb-1">Sisa</div>
                <div className="text-2xl font-bold text-amber-400">{Math.max(0, remaining)}</div>
              </div>
            </div>
            
            {lockedCount > 0 && (
              <div className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg mb-4 flex items-center justify-center gap-1.5 font-medium">
                <i className="fas fa-lock"></i>
                {lockedCount} aset dikecualikan (sedang diproses / In Transit)
              </div>
            )}

            {/* Progress Bar */}
            {totalAssets > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                  <span>Progress Opname</span>
                  <span className="font-semibold text-slate-50">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, progress)}%`,
                      background: progress >= 100
                        ? 'linear-gradient(90deg, #10b981, #059669)'
                        : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                    }}
                  />
                </div>
                {progress >= 100 && (
                  <p className="text-xs text-emerald-400 text-center mt-2 font-semibold">
                    🎉 Target aset tercapai! Anda dapat mengajukan rekonsiliasi.
                  </p>
                )}
              </div>
            )}

            {/* Last Scan Message */}
            {lastScanMsg && (
              <div className={`text-xs px-3 py-2.5 rounded-xl mb-3 font-medium flex items-center gap-2 ${
                lastScanMsg.ok
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/15 border border-red-500/30 text-red-400'
              }`}>
                {lastScanMsg.ok ? <i className="fas fa-check-circle" /> : <i className="fas fa-exclamation-circle" />}
                {lastScanMsg.text}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex gap-2 w-full">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-search text-slate-400"></i>
                  </div>
                  <input
                    type="text"
                    value={manualSN}
                    onChange={(e) => setManualSN(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && manualSN) {
                        handleScanResult(manualSN);
                        setManualSN('');
                      }
                    }}
                    disabled={loading}
                    className="w-full bg-slate-900/80 border border-slate-700 text-slate-50 text-sm rounded-xl pl-10 pr-12 py-3.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-inner disabled:opacity-50"
                    placeholder="Ketik S/N manual lalu Enter..."
                  />
                  <button
                    onClick={() => setScannerOpen(true)}
                    disabled={loading}
                    className="absolute inset-y-0 right-1 px-3 flex items-center text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-50"
                    title="Scan via Kamera"
                  >
                    <i className="fas fa-qrcode text-xl"></i>
                  </button>
                </div>
              </div>
              {scannedAssets.length > 0 && (
                <button
                  className="mt-2 py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  onClick={handleSubmitReconciliation}
                  disabled={loading}
                >
                  {loading ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-paper-plane" />}
                  Selesai & Ajukan Rekonsiliasi
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
            Aset Discanned
            <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
              {scannedAssets.length}
            </span>
          </h3>
          <div className="space-y-2">
            {scannedAssets.map((asset) => {
              const isBelongsToSite = siteAssets.some(a => a.id === asset.id);
              return (
                <div key={asset.id} className="relative">
                  <ItemCard item={asset} onClick={() => {}} />
                  {!isBelongsToSite && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Nyasar
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Belum Scan */}
      {activeSiteAlias && session && scannedAssets.length > 0 && remaining > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <i className="fas fa-clock text-amber-400"></i>
            Target Belum Discanned (Hilang)
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
    </div>
  );
};

export default OpnameView;

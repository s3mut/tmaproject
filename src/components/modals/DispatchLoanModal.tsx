import React, { useState, useMemo } from 'react';
import type { AssetLoan, AssetDetail, Site } from '../../types/inventory';
import { ModalShell, Button, Input } from '../ui';
import QRScannerModal from './QRScannerModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  loan: AssetLoan | null;
  assets: AssetDetail[];
  sites?: Site[];
  onDispatch: (params: {
    loanId: number;
    assetId: number;
    shippingMethod: string;
    trackingNumber: string;
  }) => Promise<void>;
}

const DispatchLoanModal: React.FC<Props> = ({
  isOpen,
  onClose,
  loan,
  assets,
  sites = [],
  onDispatch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [detailAsset, setDetailAsset] = useState<AssetDetail | null>(null);

  const getAssetRegion = (a: AssetDetail) => a.site_region || sites.find(s => s.site_alias === a.site_alias || s.site_name === a.site_name)?.region || null;

  // Filter & sortir aset siap pakai (Backup / Active), prioritaskan yang berada di Region yang sama dengan toko peminjam
  const availableAssets = useMemo(() => {
    if (!loan) return [];
    const term = searchQuery.toLowerCase().trim();
    const targetRegion = loan.site_region;

    const filtered = assets.filter(a => {
      const isReady = a.status === 'Backup' || a.status === 'Active';
      if (!isReady) return false;

      if (!term) {
        return a.category_name.toLowerCase().includes(loan.category_name.toLowerCase());
      }
      return (
        a.serial_number.toLowerCase().includes(term) ||
        (a.brand || '').toLowerCase().includes(term) ||
        (a.model_type || '').toLowerCase().includes(term) ||
        (a.computer_name || '').toLowerCase().includes(term)
      );
    });

    // Sort: aset yang region-nya sama dengan region toko ditempatkan di atas
    return filtered.sort((x, y) => {
      const xSame = getAssetRegion(x) === targetRegion ? 1 : 0;
      const ySame = getAssetRegion(y) === targetRegion ? 1 : 0;
      return ySame - xSame;
    }).slice(0, 15);
  }, [assets, loan, searchQuery, sites]);

  if (!loan) return null;

  const handleScanResult = (scannedText: string) => {
    const trimmed = scannedText.trim().toLowerCase();
    const found = assets.find(a =>
      a.serial_number.toLowerCase() === trimmed ||
      (a.external_id && a.external_id.toLowerCase() === trimmed)
    );
    if (found) {
      setSelectedAsset(found);
      setSearchQuery(found.serial_number);
      setScannerOpen(false);
      setErrorMsg('');
    } else {
      setSearchQuery(scannedText.trim());
      setSelectedAsset(null);
      setScannerOpen(false);
      setErrorMsg(`⚠️ Aset dengan S/N "${trimmed}" tidak ditemukan di master database.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedAsset) {
      setErrorMsg('Anda harus menyekan atau memilih fisik unit yang akan dipinjamkan!');
      return;
    }

    try {
      setSubmitting(true);
      await onDispatch({
        loanId: loan.id,
        assetId: selectedAsset.id,
        shippingMethod: loan.shipping_method || 'Delivery',
        trackingNumber: trackingNumber.trim(),
      });
      setSelectedAsset(null);
      setSearchQuery('');
      setTrackingNumber('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengirim unit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Alokasi & Kirim Unit (Dispatch)"
        titleIcon="fa-truck-loading"
        titleIconBg="bg-blue-500/20 text-blue-400"
      >
        <div className="space-y-4">
          {/* Tiket Summary */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700/60">
              <span className="font-mono font-bold text-amber-300">{loan.loan_code}</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold">{loan.shipping_method}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <p className="text-slate-400">Toko Peminjam:</p>
                <p className="font-bold text-slate-50 text-sm">{loan.site_alias} ({loan.site_name || 'Toko'})</p>
              </div>
              <div>
                <p className="text-slate-400">Kategori Diminta:</p>
                <p className="font-bold text-emerald-300 text-sm">{loan.category_name}</p>
              </div>
            </div>
            <div>
              <p className="text-slate-400">Tujuan / Alasan:</p>
              <p className="text-slate-200 italic">"{loan.purpose}" ({loan.duration_days} Hari)</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Cari / Scan Unit Fisik */}
            <div>
              <Input
                label="① Pilih atau Scan Barcode Unit Fisik"
                required
                placeholder="Ketik S/N atau scan barcode aset Ready..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSelectedAsset(null); }}
                icon="fa-search"
                disabled={submitting}
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

              {/* Suggestions */}
              {availableAssets.length > 0 && !selectedAsset && (
                <div className="mt-1 glass rounded-lg overflow-hidden border border-blue-500/30 max-h-64 overflow-y-auto divide-y divide-slate-700/50">
                  <div className="bg-slate-900/90 px-3 py-1.5 text-[10px] text-slate-300 uppercase tracking-wider font-bold flex justify-between">
                    <span>Rekomendasi Aset Siap Pakai ({loan.category_name})</span>
                    <span className="text-blue-400">Diprioritaskan Region {loan.site_region || 'Terkait'}</span>
                  </div>
                  {availableAssets.map((a) => {
                    const aRegion = getAssetRegion(a);
                    const isSameRegion = loan.site_region && aRegion === loan.site_region;
                    return (
                      <div
                        key={a.id}
                        className="px-3.5 py-2 hover:bg-blue-500/15 flex items-center justify-between transition-colors text-xs"
                      >
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => { setSelectedAsset(a); setSearchQuery(a.serial_number); setErrorMsg(''); }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-50 text-sm">{a.brand || 'No Brand'} {a.model_type || ''}</span>
                            {isSameRegion ? (
                              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/30">
                                ⭐ Satu Region ({aRegion})
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                📍 {aRegion || a.site_name || 'HQ'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-amber-300 font-mono mt-0.5">S/N: {a.serial_number}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDetailAsset(a); }}
                            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-[11px] border border-slate-600 flex items-center gap-1 shadow-sm"
                            title="Lihat Spesifikasi Detail Unit"
                          >
                            <i className="fas fa-eye text-blue-400" /> Detail
                          </button>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Pilih Unit ➔
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Selected Asset Confirmation Card */}
              {selectedAsset && (
                <div className="mt-2 bg-emerald-500/15 border border-emerald-500/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg shrink-0 mt-0.5">
                      <i className="fas fa-check-circle" />
                    </div>
                    <div>
                      <p className="text-xs text-emerald-300 font-semibold flex items-center gap-1.5">
                        <span>Unit Fisik Terpilih (Ready to Ship):</span>
                        {loan.site_region && getAssetRegion(selectedAsset) === loan.site_region && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                            ⭐ Sesuai Region ({getAssetRegion(selectedAsset)})
                          </span>
                        )}
                      </p>
                      <p className="text-sm font-bold text-slate-50 mt-0.5">{selectedAsset.brand} {selectedAsset.model_type}</p>
                      <p className="text-xs text-amber-300 font-mono">S/N: {selectedAsset.serial_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setDetailAsset(selectedAsset)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-600/60 flex items-center gap-1.5"
                    >
                      <i className="fas fa-search-plus text-blue-400" /> Lihat Detail
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedAsset(null); setSearchQuery(''); }}
                      className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-semibold border border-red-500/30"
                    >
                      Ganti Unit
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tracking / Resi (Bila Ekspedisi / Kurir) */}
            <div>
              <Input
                label={`② Nomor Resi / Keterangan Kurir (${loan.shipping_method})`}
                placeholder={loan.shipping_method === 'Delivery' ? 'Cth: JNE - 01293819283 / Kurir Internal: Pak Budi' : 'Cth: Diambil langsung oleh teknisi area JKT01'}
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                icon="fa-shipping-fast"
                disabled={submitting}
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <i className="fas fa-exclamation-circle text-base shrink-0"></i>
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={submitting}>
                Batal
              </Button>
              <Button type="submit" variant="primary" fullWidth loading={submitting} disabled={!selectedAsset} icon="fa-paper-plane">
                Kirim & Serahkan Unit
              </Button>
            </div>
          </form>
        </div>
      </ModalShell>

      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanResult={handleScanResult}
      />

      {/* Modal Detail Spesifikasi Aset Sebelum Assign */}
      <ModalShell
        isOpen={!!detailAsset}
        onClose={() => setDetailAsset(null)}
        title="Spesifikasi Lengkap Unit Backup"
        titleIcon="fa-microchip"
        titleIconBg="bg-amber-500/20 text-amber-300"
        maxWidth="sm:max-w-md"
      >
        {detailAsset && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80">
              <h3 className="text-sm font-bold text-slate-50 mb-1">{detailAsset.brand || 'No Brand'} — {detailAsset.model_type || 'Generic'}</h3>
              <p className="text-amber-300 font-mono font-bold text-sm">S/N: {detailAsset.serial_number}</p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                Status: {detailAsset.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 block mb-0.5"><i className="fas fa-sitemap mr-1" />Kategori:</span>
                <b className="text-slate-200">{detailAsset.category_name}</b>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5"><i className="fas fa-map-marked-alt mr-1" />Lokasi / Region:</span>
                <b className="text-blue-300">{detailAsset.site_alias || 'HQ'} ({getAssetRegion(detailAsset) || 'Pusat'})</b>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5"><i className="fas fa-desktop mr-1" />Computer Name:</span>
                <b className="text-slate-200">{detailAsset.computer_name || '—'}</b>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5"><i className="fas fa-barcode mr-1" />Aktiva / External ID:</span>
                <b className="text-slate-200 font-mono">{detailAsset.aktiva || '—'} / {detailAsset.external_id || '—'}</b>
              </div>
            </div>

            {detailAsset.description && (
              <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                <span className="text-slate-400 block mb-1 font-medium"><i className="fas fa-info-circle text-blue-400 mr-1" />Deskripsi / Keterangan Fisik:</span>
                <p className="text-slate-300 italic">"{detailAsset.description}"</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/60">
              <button
                type="button"
                onClick={() => setDetailAsset(null)}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-50 font-bold transition-all"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedAsset(detailAsset);
                  setSearchQuery(detailAsset.serial_number);
                  setErrorMsg('');
                  setDetailAsset(null);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-1.5"
              >
                <i className="fas fa-check" /> Pilih Unit Ini untuk Assign
              </button>
            </div>
          </div>
        )}
      </ModalShell>
    </>
  );
};

export default DispatchLoanModal;

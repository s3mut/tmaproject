import React, { useState, useMemo } from 'react';
import type { AssetLoan, AssetDetail } from '../../types/inventory';
import { ModalShell, Button, Input } from '../ui';
import QRScannerModal from './QRScannerModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  loan: AssetLoan | null;
  assets: AssetDetail[];
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
  onDispatch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Filter aset siap pakai (Backup / Active) yang cocok atau mirip dengan kategori request
  const availableAssets = useMemo(() => {
    if (!loan) return [];
    const term = searchQuery.toLowerCase().trim();
    return assets.filter(a => {
      // Prioritaskan status siap dipinjam
      const isReady = a.status === 'Backup' || a.status === 'Active';
      if (!isReady) return false;

      if (!term) {
        // Jika belum ngetik, sarankan yang sesuai kategori
        return a.category_name.toLowerCase().includes(loan.category_name.toLowerCase());
      }
      return (
        a.serial_number.toLowerCase().includes(term) ||
        (a.brand || '').toLowerCase().includes(term) ||
        (a.model_type || '').toLowerCase().includes(term) ||
        (a.computer_name || '').toLowerCase().includes(term)
      );
    }).slice(0, 10);
  }, [assets, loan, searchQuery]);

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
                <p className="font-bold text-white text-sm">{loan.site_alias} ({loan.site_name || 'Toko'})</p>
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
                <div className="mt-1 glass rounded-lg overflow-hidden border border-blue-500/30 max-h-48 overflow-y-auto divide-y divide-slate-700/50">
                  <div className="bg-slate-900/90 px-3 py-1.5 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Rekomendasi Aset Siap Pakai ({loan.category_name})
                  </div>
                  {availableAssets.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className="w-full text-left px-3.5 py-2.5 hover:bg-blue-500/15 flex items-center justify-between transition-colors"
                      onClick={() => { setSelectedAsset(a); setSearchQuery(a.serial_number); setErrorMsg(''); }}
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{a.brand || 'No Brand'} {a.model_type || ''}</p>
                        <p className="text-xs text-slate-400 font-mono">S/N: {a.serial_number}</p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {a.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Asset Confirmation Card */}
              {selectedAsset && (
                <div className="mt-2 bg-emerald-500/15 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg shrink-0">
                      <i className="fas fa-check-circle" />
                    </div>
                    <div>
                      <p className="text-xs text-emerald-300 font-semibold">Unit Fisik Terikat (Ready to Ship):</p>
                      <p className="text-sm font-bold text-white">{selectedAsset.brand} {selectedAsset.model_type}</p>
                      <p className="text-xs text-slate-300 font-mono">S/N: {selectedAsset.serial_number}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedAsset(null); setSearchQuery(''); }}
                    className="text-slate-400 hover:text-red-400 p-2 text-xs font-medium underline"
                  >
                    Ganti
                  </button>
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
    </>
  );
};

export default DispatchLoanModal;

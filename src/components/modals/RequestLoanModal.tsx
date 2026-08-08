import React, { useState, useMemo } from 'react';
import type { Site, Category, AssetDetail } from '../../types/inventory';
import { ModalShell, Button, Input, Select, Textarea, SiteSearchInput } from '../ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sites: Site[];
  categories: Category[];
  assets?: AssetDetail[];
  currentUserId?: number;
  currentUserName?: string;
  onSubmit: (params: {
    siteAlias: string;
    categoryName: string;
    purpose: string;
    durationDays: number;
    shippingMethod: string;
    isCrossRegion?: boolean;
  }) => Promise<void>;
  initialSiteAlias?: string;
}

const RequestLoanModal: React.FC<Props> = ({
  isOpen,
  onClose,
  sites,
  categories,
  assets = [],
  currentUserId,
  currentUserName,
  onSubmit,
  initialSiteAlias = '',
}) => {
  const [siteAlias, setSiteAlias] = useState(initialSiteAlias);
  const [categoryName, setCategoryName] = useState(categories[0]?.name || 'Monitor Kasir');
  const [purpose, setPurpose] = useState('');
  const [durationDays, setDurationDays] = useState(14);
  const [shippingMethod, setShippingMethod] = useState('Pick-up');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedSite = sites.find(s => (s.site_alias || '').toLowerCase() === siteAlias.trim().toLowerCase());
  const isOverLimit = durationDays > 14;

  // Background check regional backup stock dari tabel master assets & sites.region
  const storeRegion = selectedSite?.region || null;
  const availableBackups = useMemo(() => {
    if (!assets || !storeRegion) return [];
    return assets.filter(a => {
      const isReady = a.status === 'Backup' || a.status === 'Active';
      const matchCategory = !categoryName || a.category_name === categoryName;
      const assetRegion = a.site_region || sites.find(s => s.site_alias === a.site_alias || s.site_name === a.site_name || s.site_code === a.full_location_code)?.region;
      return isReady && matchCategory && assetRegion === storeRegion;
    });
  }, [assets, storeRegion, categoryName, sites]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!siteAlias.trim()) {
      setErrorMsg('Alias Toko wajib diisi!');
      return;
    }
    if (!selectedSite) {
      setErrorMsg(`Alias Toko "${siteAlias}" tidak ditemukan di database master sites.`);
      return;
    }
    if (!purpose.trim() || purpose.length < 5) {
      setErrorMsg('Tujuan / alasan pinjam wajib dijelaskan minimal 5 karakter!');
      return;
    }
    if (durationDays < 1 || durationDays > 365) {
      setErrorMsg('Durasi hari peminjaman tidak valid (1 - 365 hari).');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        siteAlias: selectedSite.site_alias || siteAlias.toUpperCase(),
        categoryName,
        purpose,
        durationDays,
        shippingMethod,
        isCrossRegion: availableBackups.length === 0,
      });
      // Reset form
      setPurpose('');
      setDurationDays(14);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan pengajuan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Ajukan Pinjaman / Unit Backup"
      titleIcon="fa-hand-holding-box"
      titleIconBg="bg-blue-500/20 text-blue-400"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Alias Toko */}
        <div>
          <SiteSearchInput
            label="① Pilih Lokasi / Alias Toko"
            required
            placeholder="Ketik kode/alias toko (cth: TKO01)..."
            sites={sites}
            value={siteAlias}
            onChange={setSiteAlias}
            disabled={submitting}
          />
        </div>

        {/* Step 2: Kategori Device */}
        <div>
          <Select
            label="② Kategori Device yang Dibutuhkan"
            required
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            disabled={submitting}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.name} className="bg-slate-900 text-slate-900 dark:text-white">
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Regional Allocation Preview */}
        {selectedSite && (
          <div className="bg-slate-800/80 border border-blue-500/40 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
              <span className="font-bold text-blue-300 flex items-center gap-1.5">
                <i className="fas fa-map-marker-alt text-blue-400" />
                Region Toko: <b className="text-slate-900 dark:text-white uppercase">{storeRegion || 'Umum'}</b>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-900/50 text-blue-200 text-[10px] font-bold border border-blue-500/30">
                Auto-Filter Region
              </span>
            </div>
            <div>
              <p className="text-slate-300 mb-1.5 font-medium">
                📦 Preview Alokasi Unit Backup (Kategori: <b className="text-slate-900 dark:text-white">{categoryName}</b>):
              </p>
              {availableBackups.length > 0 ? (
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-2.5 text-emerald-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-xs">
                    <i className="fas fa-check-circle text-emerald-400 text-sm" />
                    Tersedia {availableBackups.length} Unit Backup Ready di Region {storeRegion}!
                  </p>
                  <p className="text-[11px] text-emerald-300/80 pl-5">
                    📍 Unit akan dialokasikan dari hub terdekat: <b className="text-slate-900 dark:text-white">{Array.from(new Set(availableBackups.map(a => a.site_name || a.site_alias || 'Gudang IT Region'))).join(', ')}</b>
                  </p>
                </div>
              ) : (
                <div className="bg-indigo-950/50 border border-indigo-500/40 rounded-lg p-3 text-indigo-200 space-y-1.5">
                  <p className="font-extrabold flex items-center gap-1.5 text-xs text-indigo-300">
                    <i className="fas fa-random text-indigo-400 text-sm animate-pulse" />
                    Alur B (Eskalasi Cross-Region): Stok di Region {storeRegion || 'Toko'} Kosong
                  </p>
                  <p className="text-[11px] text-indigo-200/90 leading-relaxed pl-5">
                    🚚 Pengajuan Anda secara otomatis disalurkan dengan status <b>Eskalasi Cross-Region (Waiting Admin Approval)</b> agar Admin Global dapat mengizinkan alokasi dari <b>Gudang Pusat (HQ)</b> atau wilayah lain.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Tujuan & Alasan Pinjam */}
        <div>
          <Textarea
            label="③ Tujuan / Alasan Pinjam"
            required
            rows={3}
            placeholder="Contoh: POS kasir utama rusak (mati total), sedang proses klaim garansi / menunggu teknisi RMA."
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            disabled={submitting}
          />
        </div>

        {/* Step 4: Durasi & Pengiriman */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              label="④ Estimasi Durasi (Hari)"
              type="number"
              required
              min={1}
              max={365}
              value={durationDays}
              onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || 14)}
              disabled={submitting}
              icon="fa-calendar-alt"
            />
          </div>
          <div>
            <Select
              label="⑤ Metode Pengiriman"
              value={shippingMethod}
              onChange={(e) => setShippingMethod(e.target.value)}
              disabled={submitting}
            >
              <option value="Pick-up" className="bg-slate-900 text-slate-900 dark:text-white">Pick-up (Ambil di Gudang)</option>
              <option value="Delivery" className="bg-slate-900 text-slate-900 dark:text-white">Delivery (Kurir / Ekspedisi)</option>
            </Select>
          </div>
        </div>

        {/* Dynamic Alert untuk Durasi > 14 Hari */}
        {isOverLimit && (
          <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-200">
            <i className="fas fa-exclamation-triangle text-amber-400 text-base mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-amber-300 mb-0.5">Memerlukan Persetujuan Khusus IT</p>
              Durasi standar peminjaman adalah maksimal <b>14 Hari</b>. Pengajuan selama <b>{durationDays} Hari</b> akan ditandai dengan status <span className="underline">Waiting IT Approval</span> untuk divalidasi oleh petugas IT / Admin.
            </div>
          </div>
        )}

        {/* User Info Info */}
        <div className="glass rounded-xl p-3 flex items-center justify-between text-xs text-slate-400 border border-slate-700/50">
          <span>Pengaju: <b>{currentUserName || 'User Toko'}</b></span>
          <span className="font-mono">ID: {currentUserId || '—'}</span>
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
          <Button type="submit" variant="primary" fullWidth loading={submitting} icon="fa-paper-plane">
            Kirim Pengajuan
          </Button>
        </div>
      </form>
    </ModalShell>
  );
};

export default RequestLoanModal;

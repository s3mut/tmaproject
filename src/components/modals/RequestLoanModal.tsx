import React, { useState } from 'react';
import type { Site, Category } from '../../types/inventory';
import { ModalShell, Button, Input, Select, Textarea, SiteSearchInput } from '../ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sites: Site[];
  categories: Category[];
  currentUserId?: number;
  currentUserName?: string;
  onSubmit: (params: {
    siteAlias: string;
    categoryName: string;
    purpose: string;
    durationDays: number;
    shippingMethod: string;
  }) => Promise<void>;
}

const RequestLoanModal: React.FC<Props> = ({
  isOpen,
  onClose,
  sites,
  categories,
  currentUserId,
  currentUserName,
  onSubmit,
}) => {
  const [siteAlias, setSiteAlias] = useState('');
  const [categoryName, setCategoryName] = useState(categories[0]?.name || 'Monitor Kasir');
  const [purpose, setPurpose] = useState('');
  const [durationDays, setDurationDays] = useState(14);
  const [shippingMethod, setShippingMethod] = useState('Pick-up');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedSite = sites.find(s => (s.site_alias || '').toLowerCase() === siteAlias.trim().toLowerCase());
  const isOverLimit = durationDays > 14;

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
              <option key={c.id} value={c.name} className="bg-slate-900 text-white">
                {c.name}
              </option>
            ))}
          </Select>
        </div>

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
              <option value="Pick-up" className="bg-slate-900 text-white">Pick-up (Ambil di Gudang)</option>
              <option value="Delivery" className="bg-slate-900 text-white">Delivery (Kurir / Ekspedisi)</option>
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

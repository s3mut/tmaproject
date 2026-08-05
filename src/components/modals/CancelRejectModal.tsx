import React, { useState, useEffect } from 'react';
import { ModalShell, Button, Select, Textarea } from '../ui';

export type ActionType = 'cancel' | 'reject' | 'force_cancel';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  actionType: ActionType;
  loanCode?: string;
  onConfirm: (reason: string) => Promise<void> | void;
}

const REASON_OPTIONS: Record<ActionType, Array<{ value: string; label: string }>> = {
  cancel: [
    { value: 'Salah pilih kategori / barang', label: '❌ Salah pilih kategori atau spesifikasi unit' },
    { value: 'Acara / kegiatan dibatalkan', label: '📅 Acara / kegiatan dibatalkan atau terlampaui' },
    { value: 'Masalah teknis terselesaikan mandiri', label: '🛠️ Masalah POS/Perangkat teratasi secara mandiri' },
    { value: 'Lainnya', label: '📝 Alasan Lainnya (Jelaskan pada keterangan)' },
  ],
  reject: [
    { value: 'Stok unit backup sedang tidak tersedia di region', label: '📦 Stok unit backup di region sedang tidak tersedia' },
    { value: 'Permintaan tidak memenuhi standar prosedur (SOP)', label: '⚠️ Permintaan tidak memenuhi persyaratan standar (SOP)' },
    { value: 'Alokasi diprioritaskan untuk kendala kritis lain', label: '🚨 Alokasi dialihkan untuk penanganan kendala kritis lain' },
    { value: 'Lainnya', label: '📝 Alasan Lainnya (Jelaskan pada keterangan)' },
  ],
  force_cancel: [
    { value: 'Penarikan darurat aset oleh Admin Global (Audit)', label: '⚡ Penarikan paksa darurat untuk keperluan Audit / Pusat' },
    { value: 'Pelanggaran batas durasi peminjaman tanpa persetujuan', label: '🛑 Pelanggaran batas durasi peminjaman tanpa perpanjangan' },
    { value: 'Instruksi manajemen / pemutusan kontrak toko', label: '🏢 Pembatalan paksa atas instruksi manajemen / relokasi toko' },
    { value: 'Lainnya', label: '⚡ Alasan Lainnya (Jelaskan secara rinci di bawah)' },
  ],
};

const CancelRejectModal: React.FC<Props> = ({
  isOpen,
  onClose,
  actionType,
  loanCode,
  onConfirm,
}) => {
  const options = REASON_OPTIONS[actionType] || REASON_OPTIONS.cancel;
  const [selectedCategory, setSelectedCategory] = useState(options[0]?.value || '');
  const [noteText, setNoteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(options[0]?.value || '');
      setNoteText('');
      setError(null);
    }
  }, [isOpen, actionType]);

  const handleSubmit = async () => {
    if (selectedCategory === 'Lainnya' && !noteText.trim()) {
      setError('Harap lengkapi detail keterangan alasan pembatalan/penolakan.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const finalReason = selectedCategory === 'Lainnya'
        ? (noteText.trim() ? `Lainnya: ${noteText.trim()}` : 'Lainnya')
        : (noteText.trim() ? `${selectedCategory} (${noteText.trim()})` : selectedCategory);

      await onConfirm(finalReason);
      onClose();
    } catch (e: any) {
      console.error('Failed Action:', e);
      setError(e.message || 'Gagal memproses tindakan.');
    } finally {
      setLoading(false);
    }
  };

  let title = 'Pembatalan Pengajuan';
  let titleIcon = 'fa-ban';
  let iconBg = 'bg-slate-500/20 text-slate-400';
  let btnText = 'Batalkan Pengajuan';
  let btnVariant: 'primary' | 'danger' | 'warning' = 'danger';

  if (actionType === 'reject') {
    title = 'Tolak Pengajuan (IT Support)';
    titleIcon = 'fa-times-circle';
    iconBg = 'bg-red-500/20 text-red-400';
    btnText = 'Konfirmasi Tolak';
  } else if (actionType === 'force_cancel') {
    title = '⚡ God Mode: Force Cancel (Admin Global)';
    titleIcon = 'fa-user-shield';
    iconBg = 'bg-amber-500/20 text-amber-400';
    btnText = '⚡ Lakukan Force Cancel';
    btnVariant = 'warning';
  }

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      titleIcon={titleIcon}
      titleIconBg={iconBg}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {actionType === 'force_cancel' ? (
          <div className="bg-gradient-to-r from-amber-500/20 to-red-500/15 border border-amber-500/40 rounded-xl p-3.5 flex items-start gap-3">
            <i className="fas fa-exclamation-triangle text-amber-400 text-lg shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 leading-relaxed">
              <span className="font-bold block text-amber-400 mb-0.5">Otoritas Tertinggi Admin Global</span>
              Anda sedang membatalkan paksa tiket <strong>{loanCode}</strong>. Jika unit telah dipindahkan atau dalam status Borrowed, status fisik aset akan dikembalikan secara otomatis menjadi <strong>Backup</strong> di master database.
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-300">
            Harap pilih alasan terstruktur mengapa tiket <strong>{loanCode}</strong> dibatalkan atau ditolak demi rekam jejak audit (Audit Trail).
          </p>
        )}

        {/* Category Selector */}
        <Select
          label="Kategori Alasan (Wajib)"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
              {opt.label}
            </option>
          ))}
        </Select>

        {/* Textarea Alasan Tambahan */}
        <Textarea
          label={selectedCategory === 'Lainnya' ? "Detail Keterangan (Wajib diisi untuk opsi 'Lainnya')" : "Keterangan Tambahan / Catatan Internal (Opsional)"}
          placeholder="Contoh: Stok sedang dialihkan untuk pembubaran event gerai mal..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={3}
          className="text-xs"
        />

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <i className="fas fa-exclamation-circle text-red-500 text-sm" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/60">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button variant={btnVariant} onClick={handleSubmit} loading={loading}>
            {btnText}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
};

export default CancelRejectModal;

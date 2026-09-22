import React, { useState, useRef } from 'react';
import type { AssetDetail } from '../../types/inventory';
import { DISPOSAL_REASON_OPTIONS } from '../../types/inventory';
import { ModalShell, Button, Textarea } from '../ui';
import { proposeDisposal } from '../../services/assetService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  asset: AssetDetail | null;
  currentUserId: number;
  onSuccess?: (serialNumber: string) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

const ProposeDisposalModal: React.FC<Props> = ({
  isOpen,
  onClose,
  asset,
  currentUserId,
  onSuccess,
  onShowToast,
}) => {
  const [reasonCategory, setReasonCategory] = useState<string>(DISPOSAL_REASON_OPTIONS[0]);
  const [reasonDetail, setReasonDetail]     = useState('');
  const [photoFile, setPhotoFile]           = useState<File | null>(null);
  const [photoPreview, setPhotoPreview]     = useState<string | null>(null);
  const [submitting, setSubmitting]         = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!asset) return null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      onShowToast?.('Ukuran foto maksimal 5MB.', 'error');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!reasonCategory) {
      onShowToast?.('Pilih alasan afkir terlebih dahulu.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      // Upload foto ke Supabase Storage jika ada
      let photoUrl: string | undefined;
      if (photoFile) {
        const ext = photoFile.name.split('.').pop();
        const filename = `disposal/${asset.id}_${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadErr } = await import('../../lib/supabase').then(
          m => m.supabase.storage.from('disposal-photos').upload(filename, photoFile, { upsert: true })
        );
        if (!uploadErr && uploadData) {
          const { data: urlData } = await import('../../lib/supabase').then(
            m => m.supabase.storage.from('disposal-photos').getPublicUrl(filename)
          );
          photoUrl = urlData?.publicUrl;
        }
      }

      const result = await proposeDisposal(
        asset.id,
        reasonCategory,
        currentUserId,
        {
          reasonDetail: reasonDetail.trim() || undefined,
          photoUrl,
          source: 'AD_HOC',
        }
      );

      onShowToast?.(
        `✅ Usulan afkir untuk ${result.serialNumber} berhasil diajukan. Status diubah ke PENDING_DISPOSAL.`,
        'success'
      );
      onSuccess?.(result.serialNumber);
      onClose();
    } catch (err: any) {
      onShowToast?.(err.message ?? 'Gagal mengajukan usulan afkir.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setReasonCategory(DISPOSAL_REASON_OPTIONS[0]);
    setReasonDetail('');
    setPhotoFile(null);
    setPhotoPreview(null);
    onClose();
  };

  return (
    <ModalShell isOpen={isOpen} onClose={handleClose} title="Usulkan Afkir Aset" titleIcon="fa-trash-alt">
      {/* Warning Banner */}
      <div className="rounded-xl p-3 mb-4 bg-orange-500/10 border border-orange-500/30 flex items-start gap-3">
        <i className="fas fa-exclamation-triangle text-orange-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-orange-300">Perhatian!</p>
          <p className="text-xs text-orange-300/80 mt-0.5">
            Aset akan berstatus <strong>PENDING_DISPOSAL</strong> dan dikunci dari semua transaksi.
            Disposal final memerlukan persetujuan Super Admin.
          </p>
        </div>
      </div>

      {/* Asset Summary */}
      <div className="glass rounded-xl p-3 mb-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${asset.category_color_bg} ${asset.category_color_text} flex items-center justify-center flex-shrink-0`}>
          <i className={`fas ${asset.category_icon} text-sm`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100 truncate">{asset.brand} {asset.model_type}</p>
          <p className="text-xs text-slate-400 font-mono">{asset.serial_number}</p>
          <p className="text-xs text-slate-500">{asset.site_name ?? asset.site_alias ?? '—'}</p>
        </div>
      </div>

      {/* Alasan Baku */}
      <div className="mb-3">
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          <i className="fas fa-list-ul mr-1.5 text-slate-500" />
          Alasan Afkir <span className="text-red-400">*</span>
        </label>
        <div className="space-y-1.5">
          {DISPOSAL_REASON_OPTIONS.map((reason) => (
            <label
              key={reason}
              className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                reasonCategory === reason
                  ? 'bg-orange-500/20 border border-orange-500/50'
                  : 'bg-white/5 border border-transparent hover:bg-white/10'
              }`}
            >
              <input
                type="radio"
                name="disposal-reason"
                value={reason}
                checked={reasonCategory === reason}
                onChange={() => setReasonCategory(reason as typeof DISPOSAL_REASON_OPTIONS[number])}
                className="accent-orange-400"
              />
              <span className={`text-xs ${reasonCategory === reason ? 'text-orange-200' : 'text-slate-300'}`}>
                {reason}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Keterangan Tambahan */}
      <div className="mb-3">
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          <i className="fas fa-comment mr-1.5 text-slate-500" />
          Keterangan Tambahan
        </label>
        <Textarea
          value={reasonDetail}
          onChange={(e) => setReasonDetail(e.target.value)}
          placeholder="Jelaskan kondisi kerusakan secara detail (opsional)..."
          rows={3}
        />
      </div>

      {/* Upload Foto */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          <i className="fas fa-camera mr-1.5 text-slate-500" />
          Foto Kondisi Aset
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
        />

        {photoPreview ? (
          <div className="relative rounded-xl overflow-hidden">
            <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover" />
            <button
              onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 flex items-center justify-center hover:bg-red-500 transition-colors"
            >
              <i className="fas fa-times text-white text-xs" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-28 rounded-xl border-2 border-dashed border-slate-600 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-orange-400"
          >
            <i className="fas fa-cloud-upload-alt text-2xl" />
            <span className="text-xs">Klik untuk upload foto (maks. 5MB)</span>
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button variant="ghost" fullWidth onClick={handleClose} disabled={submitting}
          className="border border-slate-600">
          Batal
        </Button>
        <Button
          variant="ghost"
          fullWidth
          icon={submitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'}
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-orange-500/15 text-orange-300 border border-orange-500/40 hover:bg-orange-500/25"
        >
          {submitting ? 'Mengajukan...' : 'Ajukan Usulan Afkir'}
        </Button>
      </div>
    </ModalShell>
  );
};

export default ProposeDisposalModal;

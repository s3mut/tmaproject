import { useState } from 'react';
import type { TelegramUser } from '../../types/inventory';
import { requestITAccess, getTelegramSDKUser } from '../../services/userService';
import { useFormValidation } from '../../hooks/useFormValidation';
import { ModalShell, Button, Textarea } from '../ui';

interface Props {
  isOpen:      boolean;
  currentUser: TelegramUser;
  onClose:     () => void;
  onSuccess:   (message: string) => void;
}

/**
 * RequestAccessModal — refactored with design system components.
 */
const RequestAccessModal = ({ isOpen, currentUser, onClose, onSuccess }: Props) => {
  const { values, errors, setFieldValue, validate } = useFormValidation({ noteText: '' });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const sdkUser = getTelegramSDKUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validate({
      noteText: (val) => !val.trim() ? 'Alasan/Divisi wajib diisi' : null
    });
    if (!isValid) return;

    setSubmitting(true);
    try {
      const res = await requestITAccess(currentUser, values.noteText);
      onSuccess(res.message);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Gagal mengirim pengajuan akses.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      title="Pengajuan Akses Tim IT"
      titleIcon="fa-user-shield"
      titleIconBg="bg-yellow-500/20 text-yellow-400"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* User Identification */}
        <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Nama Telegram:</span>
            <span className="font-semibold text-slate-50">{currentUser.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Telegram ID:</span>
            <span className="font-mono text-yellow-400">{currentUser.telegram_id}</span>
          </div>
          {sdkUser.username && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Username:</span>
              <span className="text-blue-400">@{sdkUser.username}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Status Saat Ini:</span>
            <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-semibold uppercase text-[10px]">
              {currentUser.role} (Akses Terbatas)
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Textarea
              label="Alasan / Divisi / Cabang" required
              placeholder="Contoh: Staff IT Support Cabang Jakarta, minta akses kelola unit..."
              value={values.noteText}
              onChange={e => setFieldValue('noteText', e.target.value)}
              error={errors.noteText}
            />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-[11px] text-blue-300 space-y-1">
            <p className="font-semibold flex items-center gap-1">
              <i className="fas fa-paper-plane text-xs" /> Notifikasi Otomatis ke Telegram Bot:
            </p>
            <p className="text-blue-300/80">• Pesan notifikasi dengan tombol persetujuan 1-klik akan dikirimkan langsung ke Grup Admin IT.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={onClose}>Batal</Button>
            <Button type="submit" variant="warning" fullWidth loading={submitting} icon="fa-paper-plane">
              Kirim Request
            </Button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
};

export default RequestAccessModal;

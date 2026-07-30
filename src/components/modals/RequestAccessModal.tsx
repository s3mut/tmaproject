import { useState } from 'react';
import type { TelegramUser } from '../../types/inventory';
import { requestITAccess, getTelegramSDKUser } from '../../services/userService';

interface Props {
  isOpen: boolean;
  currentUser: TelegramUser;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const RequestAccessModal = ({ isOpen, currentUser, onClose, onSuccess }: Props) => {
  const [noteText, setNoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const sdkUser = getTelegramSDKUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await requestITAccess(currentUser, noteText);
      onSuccess(res.message);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Gagal mengirim pengajuan akses.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content p-6 max-w-md mx-auto space-y-4">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
              <i className="fas fa-user-shield text-lg"></i>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Pengajuan Akses Tim IT</h2>
              <p className="text-xs text-slate-400">Verifikasi & Approval Grup IT</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* User Identification Summary */}
        <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Nama Telegram:</span>
            <span className="font-semibold text-white">{currentUser.name}</span>
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
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Alasan / Divisi / Cabang <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Contoh: Staff IT Support Cabang Jakarta, minta akses kelola unit..."
              className="form-input w-full rounded-xl px-3.5 py-2.5 text-xs bg-slate-900 border-slate-700 text-white placeholder-slate-500 resize-none"
            />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-[11px] text-blue-300 space-y-1">
            <p className="font-semibold flex items-center gap-1">
              <i className="fas fa-paper-plane text-xs"></i> Notifikasi Otomatis ke Telegram Bot:
            </p>
            <p className="text-blue-300/80">• Pesan notifikasi dengan tombol persetujuan 1-klik akan dikirimkan langsung ke Grup Admin IT.</p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs shadow-lg shadow-yellow-500/20 disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Mengirim...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i> Kirim Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestAccessModal;

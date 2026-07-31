import { useState } from 'react';
import { setWebPassword, removeWebAccess } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

type Step = 'menu' | 'set_password' | 'remove_confirm';

const SetPasswordModal = ({ isOpen, onClose, onSuccess }: Props) => {
  const { currentUser, authMethod, refreshUser } = useAuth();
  const [step, setStep] = useState<Step>('menu');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass]               = useState(false);
  const [submitting, setSubmitting]           = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  const hasWebAccess = !!(currentUser as any).has_web_access || authMethod === 'web';

  const resetState = () => {
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setShowPass(false);
    setStep('menu');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }
    setSubmitting(true);
    try {
      await setWebPassword(currentUser.telegram_id, newPassword);
      await refreshUser();
      onSuccess('Password web berhasil diset! Anda sekarang bisa login via browser.');
      handleClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAccess = async () => {
    setSubmitting(true);
    try {
      await removeWebAccess(currentUser.telegram_id);
      await refreshUser();
      onSuccess('Akses web berhasil dihapus.');
      handleClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="modal-content p-6 max-w-sm mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <i className="fas fa-key text-lg"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Password Akses Web</h2>
              <p className="text-[11px] text-slate-400">Login via browser tanpa Telegram</p>
            </div>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-xs">
            <i className="fas fa-exclamation-circle mt-0.5 shrink-0"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Step: Menu */}
        {step === 'menu' && (
          <div className="space-y-3">
            {/* Status Banner */}
            <div className={`flex items-center gap-3 p-3 rounded-xl border text-xs ${hasWebAccess ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800 border-slate-700'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${hasWebAccess ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                <i className={`fas ${hasWebAccess ? 'fa-globe' : 'fa-globe-slash'}`}></i>
              </div>
              <div>
                <p className={`font-semibold ${hasWebAccess ? 'text-emerald-300' : 'text-slate-300'}`}>
                  Akses Web: {hasWebAccess ? 'Aktif' : 'Belum Diset'}
                </p>
                <p className={`${hasWebAccess ? 'text-emerald-400/70' : 'text-slate-500'} text-[10px]`}>
                  {hasWebAccess ? 'Anda sudah bisa login via browser.' : 'Set password untuk dapat login via browser.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => { setStep('set_password'); setError(null); }}
              className="w-full py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 font-medium text-xs flex items-center justify-center gap-2 transition-all"
            >
              <i className="fas fa-key"></i>
              {hasWebAccess ? 'Ubah Password Web' : 'Set Password Web'}
            </button>

            {hasWebAccess && (
              <button
                onClick={() => { setStep('remove_confirm'); setError(null); }}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 text-slate-400 hover:text-red-400 font-medium text-xs flex items-center justify-center gap-2 transition-all"
              >
                <i className="fas fa-ban"></i> Hapus Akses Web
              </button>
            )}
          </div>
        )}

        {/* Step: Set Password Form */}
        {step === 'set_password' && (
          <form onSubmit={handleSetPassword} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Password Baru</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 karakter"
                  required
                  className="form-input w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-600 outline-none focus:border-blue-500 transition-all"
                />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs">
                  <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Konfirmasi Password</label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password"
                required
                className="form-input w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-600 outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setStep('menu')} className="flex-1 py-2.5 rounded-xl bg-slate-700 text-slate-300 text-xs font-medium">
                Kembali
              </button>
              <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5">
                {submitting ? <><i className="fas fa-spinner fa-spin"></i> Menyimpan...</> : <><i className="fas fa-save"></i> Simpan</>}
              </button>
            </div>
          </form>
        )}

        {/* Step: Remove Confirm */}
        {step === 'remove_confirm' && (
          <div className="space-y-3">
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center mx-auto mb-3 text-2xl">
                <i className="fas fa-ban"></i>
              </div>
              <p className="text-sm font-bold text-white">Hapus Akses Web?</p>
              <p className="text-xs text-slate-400 mt-1">Password web akan dihapus. Anda tidak bisa login via browser sampai set ulang password.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep('menu')} className="flex-1 py-2.5 rounded-xl bg-slate-700 text-slate-300 text-xs font-medium">
                Batal
              </button>
              <button onClick={handleRemoveAccess} disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5">
                {submitting ? <><i className="fas fa-spinner fa-spin"></i></> : <><i className="fas fa-trash"></i> Hapus</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SetPasswordModal;

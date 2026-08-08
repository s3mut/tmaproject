import { useState } from 'react';
import { setWebPassword, removeWebAccess } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { ModalShell, Button, Input } from '../ui';

interface Props {
  isOpen:    boolean;
  onClose:   () => void;
  onSuccess: (msg: string) => void;
}

type Step = 'menu' | 'set_password' | 'remove_confirm';

/**
 * SetPasswordModal — refactored with design system components.
 */
const SetPasswordModal = ({ isOpen, onClose, onSuccess }: Props) => {
  const { currentUser, authMethod, refreshUser } = useAuth();
  const [step, setStep]                     = useState<Step>('menu');
  const [newPassword, setNewPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass]             = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  const hasWebAccess = !!(currentUser as any).has_web_access || authMethod === 'web';

  const resetState = () => {
    setNewPassword(''); setConfirmPassword(''); setError(null); setShowPass(false); setStep('menu');
  };

  const handleClose = () => { resetState(); onClose(); };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) { setError('Password minimal 8 karakter.'); return; }
    if (newPassword !== confirmPassword) { setError('Konfirmasi password tidak cocok.'); return; }
    setSubmitting(true);
    try {
      await setWebPassword(currentUser.telegram_id, newPassword);
      await refreshUser();
      onSuccess('Password web berhasil diset! Anda sekarang bisa login via browser.');
      handleClose();
    } catch (err: any) { setError(err.message); } finally { setSubmitting(false); }
  };

  const handleRemoveAccess = async () => {
    setSubmitting(true);
    try {
      await removeWebAccess(currentUser.telegram_id);
      await refreshUser();
      onSuccess('Akses web berhasil dihapus.');
      handleClose();
    } catch (err: any) { setError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <ModalShell
      isOpen
      onClose={handleClose}
      title="Password Akses Web"
      titleIcon="fa-key"
      titleIconBg="bg-blue-500/20 text-blue-400"
      maxWidth="max-w-sm"
    >
      <div className="space-y-4">
        {/* Error Banner */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-xs">
            <i className="fas fa-exclamation-circle mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step: Menu */}
        {step === 'menu' && (
          <div className="space-y-3">
            <div className={`flex items-center gap-3 p-3 rounded-xl border text-xs ${hasWebAccess ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800 border-slate-700'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${hasWebAccess ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                <i className={`fas ${hasWebAccess ? 'fa-globe' : 'fa-globe-slash'}`} />
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
            <Button variant="ghost" fullWidth icon="fa-key"
              className="border border-blue-500/30 bg-blue-600/10 text-blue-300 hover:bg-blue-600/20"
              onClick={() => { setStep('set_password'); setError(null); }}>
              {hasWebAccess ? 'Ubah Password Web' : 'Set Password Web'}
            </Button>
            {hasWebAccess && (
              <Button variant="ghost" fullWidth icon="fa-ban"
                className="border border-slate-700 hover:border-red-500/30 text-slate-400 hover:text-red-400"
                onClick={() => { setStep('remove_confirm'); setError(null); }}>
                Hapus Akses Web
              </Button>
            )}
          </div>
        )}

        {/* Step: Set Password */}
        {step === 'set_password' && (
          <form onSubmit={handleSetPassword} className="space-y-3">
            <Input
              label="Password Baru" required
              type={showPass ? 'text' : 'password'}
              placeholder="Min. 8 karakter"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              icon="fa-lock"
            >
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="text-slate-500 hover:text-slate-300 text-xs p-1">
                <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </Input>
            <Input
              label="Konfirmasi Password" required
              type={showPass ? 'text' : 'password'}
              placeholder="Ulangi password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              icon="fa-lock-open"
            />
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" fullWidth onClick={() => setStep('menu')}>Kembali</Button>
              <Button type="submit" variant="primary" fullWidth loading={submitting} icon="fa-save">Simpan</Button>
            </div>
          </form>
        )}

        {/* Step: Remove Confirm */}
        {step === 'remove_confirm' && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center mx-auto mb-3 text-2xl">
                <i className="fas fa-ban" />
              </div>
              <p className="text-sm font-bold text-slate-50">Hapus Akses Web?</p>
              <p className="text-xs text-slate-400 mt-1">Password web akan dihapus. Anda tidak bisa login via browser sampai set ulang password.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" fullWidth onClick={() => setStep('menu')}>Batal</Button>
              <Button variant="danger" fullWidth loading={submitting} icon="fa-trash" onClick={handleRemoveAccess}>Hapus</Button>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
};

export default SetPasswordModal;

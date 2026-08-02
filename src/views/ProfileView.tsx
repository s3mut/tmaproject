import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTelegramSDKUser } from '../services/userService';
import RequestAccessModal from '../components/modals/RequestAccessModal';
import SetPasswordModal from '../components/modals/SetPasswordModal';

interface Props {
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
  onOpenReport?: () => void;
}

const ProfileView = ({ onShowToast, onOpenReport }: Props) => {
  const { currentUser, authMethod, logout, refreshUser } = useAuth();
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [setPassModalOpen, setSetPassModalOpen] = useState(false);

  const sdkUser = getTelegramSDKUser();

  const roleColor: Record<string, string> = {
    admin: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
    user:  'text-blue-400 bg-blue-500/15 border-blue-500/30',
    guest: 'text-slate-400 bg-slate-500/15 border-slate-500/30',
  };

  const isGuest   = currentUser?.role === 'guest';
  const isPending = currentUser?.notes?.includes('PENDING_APPROVAL');
  const isTelegramLogin = authMethod === 'telegram';

  const menuItems = [
    {
      icon: 'fa-file-export', color: 'text-blue-400', bg: 'bg-blue-500/20',
      title: 'Laporan Aset (Retired)', subtitle: 'Export data barang yang dipensiunkan',
      onClick: () => onOpenReport ? onOpenReport() : alert('Fitur laporan belum tersedia!'),
    },
    {
      icon: 'fa-qrcode', color: 'text-purple-400', bg: 'bg-purple-500/20',
      title: 'Generate QR Labels', subtitle: 'Cetak label aset',
      onClick: () => alert('Fitur QR Labels akan segera tersedia!'),
    },
    {
      icon: 'fa-sync-alt', color: 'text-emerald-400', bg: 'bg-emerald-500/20',
      title: 'Sinkronisasi Data', subtitle: 'Refresh dari Supabase',
      onClick: () => window.location.reload(),
    },
    // Hanya tampilkan Set Password Web jika login via Telegram
    ...(isTelegramLogin ? [{
      icon: 'fa-key', color: 'text-blue-400', bg: 'bg-blue-500/20',
      title: 'Password Akses Web', subtitle: 'Set / ubah password untuk login via browser',
      onClick: () => setSetPassModalOpen(true),
    }] : []),
    {
      icon: 'fa-shield-alt', color: 'text-orange-400', bg: 'bg-orange-500/20',
      title: 'Info Koneksi',
      subtitle: `${currentUser?.username ? `@${currentUser.username} • ` : ''}ID: ${currentUser?.telegram_id || sdkUser.id}`,
      onClick: () => onShowToast?.(`✅ ${currentUser?.name} | Role: ${(currentUser?.role || 'guest').toUpperCase()} | Login: ${authMethod === 'telegram' ? 'Telegram' : 'Web Browser'}`, 'success'),
    },
  ];

  return (
    <div className="fade-in space-y-4">
      {/* Avatar & User Info */}
      <div className="text-center py-6 glass rounded-2xl p-6 relative overflow-hidden">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-3 text-white text-xl font-bold shadow-lg shadow-blue-500/30">
          {(currentUser?.name || 'IT').split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
        </div>
        <h2 className="text-lg font-bold text-white">{currentUser?.name || 'Pengguna'}</h2>

        {sdkUser.username && isTelegramLogin && (
          <p className="text-xs text-blue-400 font-medium">@{sdkUser.username}</p>
        )}

        <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
          <span className="text-xs text-slate-400 font-mono">ID: {currentUser?.telegram_id || '—'}</span>
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${roleColor[currentUser?.role || 'guest']}`}>
            {(currentUser?.role || 'GUEST').toUpperCase()}
          </span>
          {/* Badge metode login */}
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${isTelegramLogin ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>
            <i className={`fab ${isTelegramLogin ? 'fa-telegram' : 'fa-globe'} text-[10px]`}></i>
            {isTelegramLogin ? 'Telegram' : 'Web'}
          </span>
        </div>
      </div>

      {/* Banner Khusus Guest / Pending Request Access */}
      {isGuest && (
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/40 rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <i className="fas fa-user-lock text-lg"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Akses Tim IT (Guest)</h3>
              <p className="text-xs text-amber-200/80 mt-0.5">
                {isPending
                  ? 'Pengajuan akses Anda sedang dalam proses verifikasi oleh Admin IT.'
                  : 'Akun Anda berstatus Guest (akses terbatas). Ajukan verifikasi ke Admin untuk mendapatkan akses penuh Tim IT.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setRequestModalOpen(true)}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <i className="fas fa-paper-plane"></i>
            {isPending ? 'Kirim Ulang Request Akses IT' : 'Request Akses Tim IT'}
          </button>
        </div>
      )}

      {/* Menu Options */}
      <div className="space-y-2">
        {menuItems.map((item) => (
          <div
            key={item.title}
            className="glass rounded-xl p-4 flex items-center justify-between cursor-pointer card-hover"
            onClick={item.onClick}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center ${item.color}`}>
                <i className={`fas ${item.icon}`}></i>
              </div>
              <div>
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="text-xs text-slate-400">{item.subtitle}</p>
              </div>
            </div>
            <i className="fas fa-chevron-right text-slate-600 text-xs"></i>
          </div>
        ))}
      </div>

      {/* Logout button (hanya untuk web login) */}
      {authMethod === 'web' && (
        <button
          onClick={logout}
          className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
        >
          <i className="fas fa-sign-out-alt"></i> Keluar dari Akses Web
        </button>
      )}

      {/* Database Status Badge */}
      <div className="glass rounded-xl p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
          <i className="fas fa-database"></i>
        </div>
        <div>
          <p className="text-xs font-medium text-white">Database Supabase (PostgreSQL)</p>
          <p className="text-xs text-slate-500">
            {isTelegramLogin ? 'Auto-Synced via Telegram SDK' : 'Login via Browser (Web Session)'}
          </p>
        </div>
        <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
      </div>

      {/* Request Access Modal */}
      {currentUser && (
        <RequestAccessModal
          isOpen={requestModalOpen}
          currentUser={currentUser}
          onClose={() => setRequestModalOpen(false)}
          onSuccess={(msg) => {
            if (onShowToast) onShowToast(msg, 'success');
            else alert(msg);
            refreshUser();
          }}
        />
      )}

      {/* Set Web Password Modal (Telegram login only) */}
      <SetPasswordModal
        isOpen={setPassModalOpen}
        onClose={() => setSetPassModalOpen(false)}
        onSuccess={(msg) => {
          if (onShowToast) onShowToast(msg, 'success');
          else alert(msg);
        }}
      />
    </div>
  );
};

export default ProfileView;

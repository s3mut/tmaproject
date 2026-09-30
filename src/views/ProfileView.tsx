import { useState } from 'react';
import type { AssetDetail, TransactionDetail, Site, Category } from '../types/inventory';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getTelegramSDKUser } from '../services/userService';
import RequestAccessModal from '../components/modals/RequestAccessModal';
import SetPasswordModal from '../components/modals/SetPasswordModal';

interface Props {
  assets?:     AssetDetail[];
  transactions?: TransactionDetail[];
  sites?:      Site[];
  categories?: Category[];
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
  onOpenReport?: () => void;
  onOpenSettings?: () => void;
}

const ProfileView = ({ onShowToast }: Props) => {
  const { currentUser, authMethod, logout, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [setPassModalOpen, setSetPassModalOpen] = useState(false);

  const isGuest   = currentUser?.role === 'guest';
  const sdkUser = getTelegramSDKUser();

  const roleColor: Record<string, string> = {
    admin: 'text-yellow-500 dark:text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
    user:  'text-blue-500 dark:text-blue-400 bg-blue-500/15 border-blue-500/30',
    guest: 'text-slate-500 dark:text-slate-400 bg-slate-500/15 border-slate-500/30',
  };

  const isPending = currentUser?.notes?.includes('PENDING_APPROVAL');
  const isTelegramLogin = authMethod === 'telegram';

  const menuItems = [
    // Hanya tampilkan Set Password Web jika login via Telegram
    ...(isTelegramLogin ? [{
      icon: 'fa-key', color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-500/10 dark:bg-blue-500/20',
      title: 'Password Akses Web', subtitle: 'Set / ubah password untuk login via browser',
      onClick: () => setSetPassModalOpen(true),
    }] : []),
    {
      icon: theme === 'dark' ? 'fa-sun' : 'fa-moon', 
      color: theme === 'dark' ? 'text-yellow-400' : 'text-slate-600', 
      bg: theme === 'dark' ? 'bg-yellow-500/20' : 'bg-slate-200',
      title: 'Tema Aplikasi', 
      subtitle: `Beralih ke mode ${theme === 'dark' ? 'Terang' : 'Gelap'}`,
      onClick: toggleTheme,
    },
    {
      icon: 'fa-shield-alt', color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      title: 'Status Koneksi',
      subtitle: `Terkoneksi via ${isTelegramLogin ? 'Telegram WebApp' : 'Web Browser Session'}`,
      onClick: () => onShowToast?.(`Koneksi aktif: ${isTelegramLogin ? 'Telegram' : 'Web'}`, 'success'),
    },
  ];

  return (
    <div className="fade-in space-y-4 max-w-md mx-auto">
      {/* Avatar & User Info */}
      <div className="text-center py-6 glass rounded-3xl p-6 relative overflow-hidden shadow-lg border border-white/20 dark:border-slate-700/50">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 opacity-50 blur-2xl pointer-events-none"></div>
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 text-white text-3xl font-bold shadow-xl shadow-blue-500/30 ring-4 ring-white/40 dark:ring-white/10">
          {(currentUser?.name || 'IT').split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
        </div>
        <h2 className="relative text-xl font-bold text-slate-800 dark:text-slate-50">{currentUser?.name || 'Pengguna'}</h2>

        {sdkUser.username && isTelegramLogin && (
          <p className="relative text-sm text-blue-500 dark:text-blue-400 font-medium mt-1">@{sdkUser.username}</p>
        )}

        <div className="relative flex items-center justify-center gap-2 mt-4 flex-wrap">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800/50 px-2.5 py-1 rounded-lg">ID: {currentUser?.telegram_id || sdkUser.id || '—'}</span>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${roleColor[currentUser?.role || 'guest']}`}>
            {(currentUser?.role || 'GUEST').toUpperCase()}
          </span>
          <span className={`text-[10px] font-medium px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${isTelegramLogin ? 'bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20' : 'bg-slate-700 border border-slate-600 text-slate-300'}`}>
            <i className={`fab ${isTelegramLogin ? 'fa-telegram' : 'fa-globe'} text-[11px]`}></i>
            {isTelegramLogin ? 'Telegram' : 'Web'}
          </span>
          {currentUser?.assigned_region && (
             <span className="text-[10px] font-medium px-2.5 py-1 rounded-lg flex items-center gap-1.5 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
               <i className="fas fa-map-marker-alt"></i>
               {currentUser.assigned_region}
             </span>
          )}
        </div>
      </div>

      {/* Banner Khusus Guest / Pending Request Access */}
      {isGuest && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/30 rounded-3xl p-5 space-y-4 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <i className="fas fa-user-lock text-xl"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-50">Akses Tim IT (Guest)</h3>
              <p className="text-xs text-slate-600 dark:text-amber-200/80 mt-1 leading-relaxed">
                {isPending
                  ? 'Pengajuan akses Anda sedang dalam proses verifikasi oleh Admin IT.'
                  : 'Akun Anda berstatus Guest (akses terbatas). Ajukan verifikasi ke Admin untuk mendapatkan akses penuh Tim IT.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setRequestModalOpen(true)}
            className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <i className="fas fa-paper-plane"></i>
            {isPending ? 'Kirim Ulang Request Akses IT' : 'Request Akses Tim IT'}
          </button>
        </div>
      )}

      {/* Menu Options */}
      <div className="space-y-3 pt-2">
        {menuItems.map((item) => (
          <div
            key={item.title}
            className="glass rounded-3xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/40 dark:hover:bg-white/5 active:scale-[0.98] transition-all"
            onClick={item.onClick}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl ${item.bg} flex items-center justify-center ${item.color} shadow-sm`}>
                <i className={`fas ${item.icon} text-lg`}></i>
              </div>
              <div>
                <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100">{item.title}</p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">{item.subtitle}</p>
              </div>
            </div>
            <i className="fas fa-chevron-right text-slate-400 text-sm"></i>
          </div>
        ))}
      </div>

      {/* Logout button */}
      <button
        onClick={logout}
        className="w-full mt-6 py-4 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
      >
        <i className="fas fa-sign-out-alt text-lg"></i> Keluar dari Aplikasi
      </button>

      {/* Modals */}
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

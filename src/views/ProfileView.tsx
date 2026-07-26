import { HARDCODED_USER } from '../hooks/useInventory';

const ProfileView = () => {
  const roleColor: Record<string, string> = {
    admin: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
    user:  'text-blue-400 bg-blue-500/15 border-blue-500/30',
    guest: 'text-slate-400 bg-slate-500/15 border-slate-500/30',
  };

  const menuItems = [
    {
      icon: 'fa-file-export', color: 'text-blue-400', bg: 'bg-blue-500/20',
      title: 'Export Data', subtitle: 'CSV atau Excel',
      onClick: () => alert('Fitur export akan segera tersedia!'),
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
    {
      icon: 'fa-shield-alt', color: 'text-orange-400', bg: 'bg-orange-500/20',
      title: 'Info Koneksi', subtitle: 'Supabase: Connected',
      onClick: () => alert(`Terhubung ke Supabase\nUser: ${HARDCODED_USER.name}\nRole: ${HARDCODED_USER.role}`),
    },
  ];

  return (
    <div className="fade-in">
      {/* Avatar & User Info */}
      <div className="text-center py-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold shadow-lg shadow-blue-500/30">
          {HARDCODED_USER.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
        </div>
        <h2 className="text-lg font-bold text-white">{HARDCODED_USER.name}</h2>
        <p className="text-sm text-slate-400 mt-0.5">Telegram ID: {HARDCODED_USER.telegram_id}</p>
        <span className={`inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full border ${roleColor[HARDCODED_USER.role] ?? roleColor.guest}`}>
          {HARDCODED_USER.role.toUpperCase()}
        </span>
      </div>

      {/* Menu */}
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
            <i className="fas fa-chevron-right text-slate-600"></i>
          </div>
        ))}
      </div>

      {/* Supabase Badge */}
      <div className="mt-6 glass rounded-xl p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
          <i className="fas fa-database"></i>
        </div>
        <div>
          <p className="text-xs font-medium text-white">Database: Supabase (PostgreSQL)</p>
          <p className="text-xs text-slate-500">umhgqkbisdxfcxzkakqa.supabase.co</p>
        </div>
        <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
      </div>
    </div>
  );
};

export default ProfileView;

import type { TabName } from './BottomNav';

interface TabConfig { title: string; subtitle: string; }

const tabTitles: Record<TabName, TabConfig> = {
  dashboard: { title: 'Inventory IT',  subtitle: 'Kelola aset teknologi' },
  items:     { title: 'Daftar Aset',   subtitle: 'Semua aset terdaftar' },
  history:   { title: 'Mutasi Aset',   subtitle: 'Riwayat perpindahan' },
  sites:     { title: 'Daftar Site',   subtitle: 'Lokasi cabang & operasional' },
  opname:    { title: 'Stock Opname',  subtitle: 'Audit fisik aset' },
  profile:   { title: 'Profil',        subtitle: 'Pengaturan akun' },
  report:    { title: 'Laporan Bug / Feedback', subtitle: 'Kirim laporan & feedback' },
};

interface Props {
  activeTab: TabName;
  searchValue: string;
  userRole?: string;
  onSearchChange: (value: string) => void;
  onScanClick: () => void;
  onImportCSVClick?: () => void;
}

const Header = ({ activeTab, searchValue, userRole, onSearchChange, onScanClick, onImportCSVClick }: Props) => {
  const { title, subtitle } = tabTitles[activeTab];
  const showSearch = activeTab === 'dashboard' || activeTab === 'items';
  const isAdmin = userRole === 'admin';

  return (
    <header className="sticky top-0 z-30 glass px-4 pt-4 pb-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-white">{title}</h1>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && onImportCSVClick && (
            <button
              onClick={onImportCSVClick}
              title="Import CSV Assets (Khusus Admin)"
              className="px-3 py-1.5 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-semibold hover:bg-blue-600/50 flex items-center gap-1.5 transition-all"
            >
              <i className="fas fa-file-csv text-sm"></i>
              <span className="hidden sm:inline">Import CSV</span>
            </button>
          )}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-500/20">
            IT
          </div>
        </div>
      </div>
      {showSearch && (
        <div className="search-bar rounded-xl flex items-center px-4 py-2.5">
          <i className="fas fa-search text-slate-400 mr-3"></i>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari serial number, brand, atau site..."
            className="bg-transparent border-none outline-none text-sm w-full text-white placeholder-slate-500"
          />
          <button className="ml-2 text-blue-400" onClick={onScanClick}>
            <i className="fas fa-qrcode"></i>
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;

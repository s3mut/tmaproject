import type { TabName } from './BottomNav';

interface TabConfig { title: string; subtitle: string; }

const tabTitles: Record<TabName, TabConfig> = {
  dashboard: { title: 'Inventory IT',  subtitle: 'Kelola aset teknologi' },
  items:     { title: 'Daftar Aset',   subtitle: 'Semua aset terdaftar' },
  history:   { title: 'Mutasi Aset',   subtitle: 'Riwayat perpindahan' },
  profile:   { title: 'Profil',        subtitle: 'Pengaturan akun' },
};

interface Props {
  activeTab: TabName;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onScanClick: () => void;
}

const Header = ({ activeTab, searchValue, onSearchChange, onScanClick }: Props) => {
  const { title, subtitle } = tabTitles[activeTab];
  const showSearch = activeTab === 'dashboard' || activeTab === 'items';

  return (
    <header className="sticky top-0 z-30 glass px-4 pt-4 pb-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-white">{title}</h1>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
          IT
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

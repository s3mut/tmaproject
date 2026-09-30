export type ViewName = 'home' | 'menu' | 'profile' | 'transactions' | 'sites' | 'opname' | 'disposal' | 'report' | 'settings' | 'items' | 'loans' | 'reconciliation';

interface TabConfig { title: string; subtitle: string; }

const tabTitles: Record<ViewName, TabConfig> = {
  home:         { title: 'Inventory IT',         subtitle: 'Kelola aset teknologi' },
  menu:         { title: 'Menu Utama',           subtitle: 'Akses fitur sistem' },
  profile:      { title: 'Profil',               subtitle: 'Pengaturan akun' },
  transactions: { title: 'Mutasi Aset',          subtitle: 'Riwayat perpindahan' },
  sites:        { title: 'Daftar Site',          subtitle: 'Lokasi cabang & operasional' },
  opname:       { title: 'Stock Opname',         subtitle: 'Audit fisik aset' },
  disposal:     { title: 'Antrean Afkir',        subtitle: 'Kelola usulan pemusnahan aset' },
  report:       { title: 'Laporan & Analitik',   subtitle: 'KPI, utilization & audit trail' },
  settings:     { title: 'Super Admin Settings', subtitle: 'Pusat konfigurasi dinamis E1-TMA' },
  items:        { title: 'Daftar Aset',          subtitle: 'Katalog seluruh aset IT' },
  loans:        { title: 'Antrean Pinjaman',     subtitle: 'Daftar peminjaman aktif' },
  reconciliation: { title: 'Rekonsiliasi',       subtitle: 'Penyelarasan data stok' },
};

interface Props {
  activeView: ViewName;
  searchValue: string;
  userRole?: string;
  onSearchChange: (value: string) => void;
  onScanClick: () => void;
  onImportCSVClick?: () => void;
}

const Header = ({ activeView, searchValue, userRole, onSearchChange, onScanClick, onImportCSVClick }: Props) => {
  const { title, subtitle } = tabTitles[activeView];
  const showSearch = activeView === 'home';
  const isAdmin = userRole === 'admin';

  return (
    <header className="sticky top-0 z-30 glass px-4 pt-4 pb-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-50">{title}</h1>
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
            className="bg-transparent border-none outline-none text-sm w-full text-slate-50 placeholder-slate-500"
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

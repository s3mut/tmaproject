export type TabName = 'dashboard' | 'items' | 'history' | 'sites' | 'profile';

interface NavItem { tab: TabName; icon: string; label: string; }

const navItems: NavItem[] = [
  { tab: 'dashboard', icon: 'fa-home',       label: 'Beranda' },
  { tab: 'items',     icon: 'fa-server',     label: 'Aset' },
  { tab: 'history',   icon: 'fa-exchange-alt', label: 'Mutasi' },
  { tab: 'sites',     icon: 'fa-building',   label: 'Sites' },
  { tab: 'profile',   icon: 'fa-user',       label: 'Profil' },
];

interface Props {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
}

const BottomNav = ({ activeTab, onTabChange }: Props) => {
  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around px-2">
        {navItems.map(({ tab, icon, label }) => (
          <button
            key={tab}
            className={`nav-item ${activeTab === tab ? 'active' : ''}`}
            onClick={() => onTabChange(tab)}
          >
            <i className={`fas ${icon}`}></i>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;

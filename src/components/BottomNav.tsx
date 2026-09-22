export type TabName = 'dashboard' | 'transactions' | 'sites' | 'opname' | 'disposal' | 'profile' | 'report' | 'settings';

interface NavItem { tab: TabName; icon: string; label: string; adminOnly?: boolean; }

const navItems: NavItem[] = [
  { tab: 'dashboard',    icon: 'fa-home',           label: 'Beranda' },
  { tab: 'transactions', icon: 'fa-exchange-alt',   label: 'Transaksi' },
  { tab: 'opname',       icon: 'fa-qrcode',         label: 'Opname' },
  { tab: 'disposal',     icon: 'fa-trash-alt',      label: 'Afkir',   adminOnly: true },
  { tab: 'profile',      icon: 'fa-user',           label: 'Profil' },
];

interface Props {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
  isGuest?: boolean;
  userRole?: string;
}

const BottomNav = ({ activeTab, onTabChange, isGuest, userRole }: Props) => {
  const isAdmin = userRole === 'admin';
  const visibleNavItems = navItems.filter(item => {
    if (isGuest && item.tab !== 'transactions' && item.tab !== 'profile') {
      return false;
    }
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });
  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around px-2">
        {visibleNavItems.map(({ tab, icon, label }) => (
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

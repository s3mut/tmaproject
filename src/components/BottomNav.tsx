export type TabName = 'home' | 'menu' | 'profile';

interface NavItem { tab: TabName; icon: string; label: string; }

const navItems: NavItem[] = [
  { tab: 'home',    icon: 'fa-home',         label: 'Beranda' },
  { tab: 'menu',    icon: 'fa-th-large',     label: 'Menu' },
  { tab: 'profile', icon: 'fa-user-circle',  label: 'Profil' },
];

interface Props {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
}

const BottomNav = ({ activeTab, onTabChange }: Props) => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between w-full max-w-md mx-auto px-6 h-16">
        {navItems.map(({ tab, icon, label }) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              className="relative flex-1 flex flex-col items-center justify-center h-full focus:outline-none group"
              onClick={() => onTabChange(tab)}
            >
              <div className={`absolute inset-0 bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl transition-all duration-300 ease-out m-1 ${isActive ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}></div>
              
              <div className={`relative z-10 flex flex-col items-center transition-transform duration-300 ease-out ${isActive ? '-translate-y-0.5' : 'group-active:scale-95'}`}>
                <i className={`fas ${icon} text-[22px] transition-all duration-300 ease-out ${isActive ? 'text-blue-600 dark:text-blue-400 drop-shadow-sm' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400'}`}></i>
                <span className={`text-[10px] tracking-wide mt-1 transition-all duration-300 ${isActive ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-medium text-slate-500 dark:text-slate-400'}`}>{label}</span>
              </div>
            </button>
          )
        })}
      </div>
    </nav>
  );
};

export default BottomNav;

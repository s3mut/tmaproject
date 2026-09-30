import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { triggerHaptic } from '../utils/telegramHaptics';

interface Props {
  navigateTo: (view: string) => void;
}

interface MenuCardItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  viewPath: string;
  adminOnly?: boolean;
}

interface MenuGroup {
  groupName: string;
  items: MenuCardItem[];
}

const MenuView = ({ navigateTo }: Props) => {
  const [search, setSearch] = useState('');
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const menuGroups: MenuGroup[] = [
    {
      groupName: 'Inventaris & Aset',
      items: [
        {
          id: 'items',
          title: 'Daftar Aset',
          description: 'Katalog seluruh aset IT',
          icon: 'fa-boxes',
          iconColor: 'text-blue-500',
          viewPath: 'items'
        }
      ]
    },
    {
      groupName: 'Operasional Harian',
      items: [
        {
          id: 'transactions',
          title: 'Transaksi & Mutasi',
          description: 'Riwayat perpindahan',
          icon: 'fa-exchange-alt',
          iconColor: 'text-indigo-500',
          viewPath: 'transactions'
        },
        {
          id: 'loans',
          title: 'Antrean Pinjaman',
          description: 'Daftar peminjaman aktif',
          icon: 'fa-hand-holding-box',
          iconColor: 'text-purple-500',
          viewPath: 'loans'
        }
      ]
    },
    {
      groupName: 'Audit & Kepatuhan',
      items: [
        {
          id: 'opname',
          title: 'Stock Opname',
          description: 'Audit fisik aset',
          icon: 'fa-clipboard-check',
          iconColor: 'text-emerald-500',
          viewPath: 'opname'
        },
        {
          id: 'reconciliation',
          title: 'Rekonsiliasi',
          description: 'Penyelarasan data stok',
          icon: 'fa-balance-scale',
          iconColor: 'text-teal-500',
          viewPath: 'reconciliation'
        }
      ]
    },
    {
      groupName: 'Khusus Admin',
      items: [
        {
          id: 'disposal',
          title: 'Usulan Afkir',
          description: 'Kelola pemusnahan aset',
          icon: 'fa-trash-alt',
          iconColor: 'text-red-500',
          viewPath: 'disposal',
          adminOnly: true
        }
      ]
    },
    {
      groupName: 'Sistem',
      items: [
        {
          id: 'report',
          title: 'Laporan & Analitik',
          description: 'KPI & audit trail',
          icon: 'fa-chart-pie',
          iconColor: 'text-sky-500',
          viewPath: 'report'
        },
        {
          id: 'settings',
          title: 'Pengaturan',
          description: 'Konfigurasi E1-TMA',
          icon: 'fa-sliders-h',
          iconColor: 'text-amber-500',
          viewPath: 'settings'
        }
      ]
    }
  ];

  const filteredGroups = useMemo(() => {
    const term = search.toLowerCase().trim();
    return menuGroups.map(group => {
      // Filter out adminOnly items if not admin
      let filteredItems = group.items.filter(item => !item.adminOnly || isAdmin);
      
      // Filter by search term
      if (term) {
        filteredItems = filteredItems.filter(item => 
          item.title.toLowerCase().includes(term) || item.description.toLowerCase().includes(term)
        );
      }
      return { ...group, items: filteredItems };
    }).filter(group => group.items.length > 0);
  }, [search, isAdmin]);

  return (
    <div className="fade-in max-w-md mx-auto pb-6 relative">
      {/* Sticky Search Bar */}
      <div className="sticky top-0 z-20 mb-6 -mx-4 px-4 py-2 backdrop-blur-md bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm">
        <div className="relative">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input
            type="text"
            placeholder="Cari fitur menu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-inner text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-slate-900 dark:text-slate-50"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <i className="fas fa-times-circle"></i>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-10 opacity-70">
            <i className="fas fa-search-minus text-4xl text-slate-400 mb-3"></i>
            <p className="text-slate-500 font-medium">Fitur tidak ditemukan</p>
          </div>
        ) : (
          filteredGroups.map(group => (
            <div key={group.groupName} className="animate-fade-in-up">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider pl-1">
                {group.groupName}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {group.items.map(item => (
                  <div
                    key={item.id}
                    onClick={() => { triggerHaptic('light'); navigateTo(item.viewPath); }}
                    className="glass rounded-3xl p-4 flex flex-col justify-between cursor-pointer hover:bg-white/40 dark:hover:bg-white/5 active:scale-[0.97] transition-all border border-white/20 dark:border-slate-700/50 shadow-sm min-h-[120px]"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-sm ${item.iconColor} bg-white/50 dark:bg-slate-800/50 border border-white/50 dark:border-slate-700`}>
                        <i className={`fas ${item.icon}`}></i>
                      </div>
                      <i className="fas fa-arrow-right text-slate-300 dark:text-slate-600 text-[10px]"></i>
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-100 leading-tight">
                        {item.title}
                      </h4>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MenuView;

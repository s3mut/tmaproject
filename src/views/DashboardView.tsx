import { useState, useMemo } from 'react';
import type { AssetDetail, Category, MutationDetail, Site } from '../types/inventory';
import { SectionHeader, EmptyState } from '../components/ui';
import { SkeletonCard, SkeletonChip } from '../components/ui/Skeleton';
import { MutationBadge } from '../components/ui/Badge';
import ItemsView from './ItemsView';

interface Props {
  assets: AssetDetail[];
  sites: Site[];
  searchValue?: string;
  initialCategory?: string;
  initialStatus?: string;
  onClearFilters?: () => void;
  mutations?: MutationDetail[];
  categories: Category[];
  loading: boolean;
  onItemClick: (id: number) => void;
  onCategoryClick: (cat: string) => void;
  onViewAll?: () => void;
  onStatusClick?: (status: string, category: string) => void;
}

interface CategoryGroup {
  key: string;
  label: string;
  icon: string;
  color_text: string;
  color_bg: string;
  items: Category[];
}

const PRESET_GROUPS = [
  {
    key: 'monitor',
    label: 'Monitor',
    icon: 'fa-desktop',
    color_text: 'text-blue-400',
    color_bg: 'bg-blue-500/20',
    keywords: ['monitor', 'display', 'screen'],
  },
  {
    key: 'computer',
    label: 'Komputer / PC',
    icon: 'fa-laptop',
    color_text: 'text-purple-400',
    color_bg: 'bg-purple-500/20',
    keywords: ['pc', 'komputer', 'laptop', 'desktop', 'server', 'all-in-one', 'aio'],
  },
  {
    key: 'printer',
    label: 'Printer & Scanner',
    icon: 'fa-print',
    color_text: 'text-emerald-400',
    color_bg: 'bg-emerald-500/20',
    keywords: ['printer', 'scanner', 'cetak', 'thermal', 'barcode scanner'],
  },
  {
    key: 'network',
    label: 'Network & Perangkat',
    icon: 'fa-network-wired',
    color_text: 'text-amber-400',
    color_bg: 'bg-amber-500/20',
    keywords: ['switch', 'router', 'access point', 'ap', 'network', 'hub', 'wifi', 'cctv', 'camera', 'ups'],
  },
];

function formatTime7Days(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return 'Baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

const StatCard = ({ label, value, color, icon, gradient, border, onClick }: {
  label: string; value: number; color: string; icon: string; gradient: string; border: string;
  onClick?: () => void;
}) => (
  <div
    className={`rounded-xl p-4 transition-all ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}`}
    style={{ background: gradient, borderWidth: 1, borderStyle: 'solid', borderColor: border }}
    onClick={onClick}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-slate-400">{label}</span>
      <div className={`category-icon ${color.replace('text-', 'bg-').replace('-400', '-500/20').replace('-600', '-500/20')} ${color}`} style={{ width: 32, height: 32, fontSize: '0.9rem' }}>
        <i className={`fas ${icon}`}></i>
      </div>
    </div>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    {onClick && <p className="text-[10px] text-slate-600 mt-1">Tap untuk lihat →</p>}
  </div>
);



const DashboardView = ({ 
  assets, sites, searchValue = '', initialCategory = 'all', initialStatus = 'all', onClearFilters,
  mutations = [], categories, loading, onItemClick, onCategoryClick: _onCategoryClick, onViewAll, onStatusClick 
}: Props) => {
  const [selectedGroupKey, setSelectedGroupKey] = useState<string>('all');
  const [selectedSubCatName, setSelectedSubCatName] = useState<string>('all');

  // Dynamic Grouping of Master Categories
  const categoryGroups = useMemo(() => {
    const groups: CategoryGroup[] = PRESET_GROUPS.map((p) => ({
      key: p.key,
      label: p.label,
      icon: p.icon,
      color_text: p.color_text,
      color_bg: p.color_bg,
      items: [],
    }));

    const unassigned: Category[] = [];

    categories.forEach((cat) => {
      const nameLower = cat.name.toLowerCase();
      const matchedPreset = PRESET_GROUPS.find((p) =>
        p.keywords.some((kw) => nameLower.includes(kw))
      );
      if (matchedPreset) {
        const target = groups.find((g) => g.key === matchedPreset.key);
        if (target) target.items.push(cat);
      } else {
        unassigned.push(cat);
      }
    });

    const activeGroups = groups.filter((g) => g.items.length > 0);

    if (unassigned.length > 0) {
      activeGroups.push({
        key: 'other',
        label: 'Lainnya',
        icon: 'fa-boxes-stacked',
        color_text: 'text-slate-400',
        color_bg: 'bg-slate-700/50',
        items: unassigned,
      });
    }

    return activeGroups;
  }, [categories]);

  const activeGroup = useMemo(() => {
    return categoryGroups.find((g) => g.key === selectedGroupKey) ?? null;
  }, [categoryGroups, selectedGroupKey]);

  const activeCategoryNames = useMemo(() => {
    if (selectedGroupKey === 'all') return null;
    if (!activeGroup) return null;

    if (selectedSubCatName !== 'all') {
      return [selectedSubCatName];
    }
    return activeGroup.items.map((c) => c.name);
  }, [selectedGroupKey, activeGroup, selectedSubCatName]);

  // Filter aset berdasarkan kategori/group yang dipilih
  const filteredAssets = useMemo(() => {
    if (!activeCategoryNames) return assets;
    return assets.filter(a => activeCategoryNames.includes(a.category_name));
  }, [assets, activeCategoryNames]);

  // Filter mutasi 7 hari terakhir berdasarkan kategori/group yang dipilih
  const recentMutations = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return (mutations || []).filter((m) => {
      const mutDate = new Date(m.mutation_date);
      const isWithin7Days = mutDate >= sevenDaysAgo;
      if (!isWithin7Days) return false;
      if (activeCategoryNames && !activeCategoryNames.includes(m.asset_category_name)) return false;
      return true;
    }).slice(0, 5);
  }, [mutations, activeCategoryNames]);

  // Hitung stats dari filtered assets
  const stats = useMemo(() => ({
    total:     filteredAssets.length,
    active:    filteredAssets.filter(a => a.status === 'Active').length,
    backup:    filteredAssets.filter(a => a.status === 'Backup').length,
    retired:   filteredAssets.filter(a => a.status === 'Retired').length,
    repair:    filteredAssets.filter(a => a.status === 'Repair').length,
    inTransit: filteredAssets.filter(a => a.status === 'In Transit').length,
  }), [filteredAssets]);

  // Klik stat card: navigasi ke Items dengan status + kategori aktif
  const handleStatClick = (status: string) => {
    if (onStatusClick) {
      const catToPass = selectedSubCatName !== 'all'
        ? selectedSubCatName
        : (activeGroup && activeGroup.items.length === 1 ? activeGroup.items[0].name : 'all');
      onStatusClick(status, catToPass);
    }
  };

  const hasActiveFilter = Boolean(searchValue.trim() || initialCategory !== 'all' || initialStatus !== 'all');

  return (
    <div className="fade-in">
      {/* ── ITEMS VIEW COMPONENT (Muncul jika ada filter/pencarian) ── */}
      <div className={`transition-all duration-300 ${hasActiveFilter ? 'block' : 'hidden'}`}>
        {hasActiveFilter && (
          <>
            <div className="mb-4 flex items-center justify-between bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl shadow-lg">
              <div>
                <p className="text-sm font-bold text-blue-400">Pencarian & Filter Aktif</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {searchValue && `Kata Kunci: "${searchValue}" `}
                  {initialCategory !== 'all' && `| Kat: ${initialCategory} `}
                  {initialStatus !== 'all' && `| Stat: ${initialStatus}`}
                </p>
              </div>
              {onClearFilters && (
                <button
                  onClick={onClearFilters}
                  className="px-3 py-1.5 bg-red-500/15 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30 transition-colors shrink-0"
                >
                  <i className="fas fa-times mr-1"></i> Tutup
                </button>
              )}
            </div>
            
            <ItemsView
              assets={assets}
              sites={sites}
              searchValue={searchValue}
              initialCategory={initialCategory}
              initialStatus={initialStatus}
              categories={categories}
              loading={loading}
              onItemClick={onItemClick}
            />
          </>
        )}
      </div>

      {/* ── DASHBOARD WIDGETS (Disembunyikan jika ada filter/pencarian) ── */}
      <div className={`transition-all duration-500 ${hasActiveFilter ? 'opacity-0 max-h-0 overflow-hidden' : 'opacity-100 max-h-[9999px]'}`}>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Total card — klik untuk lihat semua */}
        <div
          className={`stat-card rounded-xl p-4 col-span-2 flex justify-between items-center ${onStatusClick ? 'cursor-pointer hover:ring-1 hover:ring-white/10 transition-all active:scale-[0.99]' : ''}`}
          onClick={() => handleStatClick('all')}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-slate-400">
                {selectedGroupKey === 'all'
                  ? 'Total Aset'
                  : selectedSubCatName !== 'all'
                  ? `Total — ${selectedSubCatName}`
                  : `Total — ${activeGroup?.label ?? selectedGroupKey}`}
              </span>
              {selectedGroupKey !== 'all' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedGroupKey('all');
                    setSelectedSubCatName('all');
                  }}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all flex items-center gap-1"
                >
                  <i className="fas fa-times"></i> Reset
                </button>
              )}
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            {onStatusClick && <p className="text-[10px] text-slate-600 mt-1">Tap untuk lihat semua →</p>}
          </div>
          <div
            className="text-right cursor-pointer"
            onClick={(e) => { e.stopPropagation(); handleStatClick('In Transit'); }}
          >
            <div className="text-xs text-slate-400 mb-1">In Transit</div>
            <p className="text-xl font-bold text-blue-400">{stats.inTransit}</p>
            {onStatusClick && <p className="text-[10px] text-slate-600 mt-0.5">Tap →</p>}
          </div>
        </div>

        <StatCard label="Active"  value={stats.active}  color="text-green-400"  icon="fa-check-circle"
          gradient="linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.05))" border="rgba(34,197,94,0.2)"
          onClick={() => handleStatClick('Active')} />
        <StatCard label="Backup"  value={stats.backup}  color="text-blue-400"   icon="fa-archive"
          gradient="linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.05))" border="rgba(59,130,246,0.2)"
          onClick={() => handleStatClick('Backup')} />
        <StatCard label="Retired" value={stats.retired} color="text-slate-500"  icon="fa-power-off"
          gradient="linear-gradient(135deg, rgba(100,116,139,0.1), rgba(100,116,139,0.05))" border="rgba(100,116,139,0.2)"
          onClick={() => handleStatClick('Retired')} />
        <StatCard label="Repair"  value={stats.repair}  color="text-yellow-400" icon="fa-tools"
          gradient="linear-gradient(135deg, rgba(234,179,8,0.1), rgba(234,179,8,0.05))" border="rgba(234,179,8,0.2)"
          onClick={() => handleStatClick('Repair')} />
      </div>

      {/* Categories Group Section */}
      <SectionHeader
        title="Kategori Aset"
        icon="fa-layer-group"
        action={selectedGroupKey !== 'all' ? {
          label: 'Reset Filter', icon: 'fa-undo',
          onClick: () => { setSelectedGroupKey('all'); setSelectedSubCatName('all'); },
        } : undefined}
        className="mb-2"
      />

      {/* Main Parent Group Chips */}
      <div className="flex gap-2.5 overflow-x-auto pb-3 mb-2 scrollbar-hide pr-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => <SkeletonChip key={i} />)
        ) : (
          <>
            {/* Chip: Semua */}
            <div
              className={`flex-shrink-0 cursor-pointer px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 text-xs font-semibold ${
                selectedGroupKey === 'all'
                  ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-blue-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
              onClick={() => { setSelectedGroupKey('all'); setSelectedSubCatName('all'); }}
            >
              <i className="fas fa-th-large text-sm"></i>
              <span>Semua</span>
            </div>

            {/* Parent Group Chips */}
            {categoryGroups.map((grp) => {
              const isActive = selectedGroupKey === grp.key;
              const count = assets.filter((a) => grp.items.some((c) => c.name === a.category_name)).length;
              return (
                <div
                  key={grp.key}
                  className={`flex-shrink-0 cursor-pointer px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2 text-xs font-semibold ${
                    isActive
                      ? `${grp.color_bg.replace('/20', '')} ${grp.color_text} ring-2 ring-offset-2 ring-offset-slate-900 ${grp.color_text.replace('text-', 'ring-')} shadow-lg`
                      : `${grp.color_bg} ${grp.color_text} hover:opacity-90`
                  }`}
                  onClick={() => {
                    setSelectedGroupKey(grp.key);
                    setSelectedSubCatName('all');
                  }}
                >
                  <i className={`fas ${grp.icon} text-sm`}></i>
                  <span>{grp.label}</span>
                  <span className="text-[10px] opacity-80 px-1.5 py-0.2 bg-black/20 rounded-full">
                    {count}
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Sub-Categories Chips (Shows when a Parent Group with > 1 subcategories is selected) */}
      {activeGroup && activeGroup.items.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          <span className="text-[11px] text-slate-400 font-medium flex-shrink-0 pl-1">
            Sub:
          </span>
          <button
            onClick={() => setSelectedSubCatName('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium flex-shrink-0 transition-all ${
              selectedSubCatName === 'all'
                ? 'bg-slate-200 text-slate-900 font-semibold shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-900 dark:text-white'
            }`}
          >
            Semua {activeGroup.label}
          </button>
          {activeGroup.items.map((sub) => {
            const isSubActive = selectedSubCatName === sub.name;
            const subCount = assets.filter((a) => a.category_name === sub.name).length;
            return (
              <button
                key={sub.id}
                onClick={() => setSelectedSubCatName(sub.name)}
                className={`px-3 py-1 rounded-lg text-xs font-medium flex-shrink-0 transition-all flex items-center gap-1.5 ${
                  isSubActive
                    ? 'bg-blue-500/30 text-blue-300 border border-blue-400/50 font-semibold'
                    : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-700/40'
                }`}
              >
                <i className={`fas ${sub.icon} text-[10px]`}></i>
                {sub.name} <span className="text-[10px] opacity-70">({subCount})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Aset Terakhir Dipindah (7 Hari Terakhir) */}
      <SectionHeader
        title={selectedGroupKey === 'all' ? 'Terakhir Dipindah (7 Hari)'
          : selectedSubCatName !== 'all' ? `Mutasi — ${selectedSubCatName} (7 Hari)`
          : `Mutasi — ${activeGroup?.label} (7 Hari)`}
        icon="fa-truck-moving"
        className="mt-2"
        action={onViewAll && !loading ? {
          label: 'Lihat Semua', iconRight: 'fa-arrow-right',
          onClick: () => { onViewAll(); setSelectedGroupKey('all'); setSelectedSubCatName('all'); },
        } : undefined}
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : recentMutations.length === 0 ? (
        <EmptyState
          icon="fa-exchange-alt"
          title="Tidak ada perpindahan aset dalam 7 hari terakhir"
          description="Riwayat mutasi akan muncul di sini secara otomatis."
        />
      ) : (
        <div className="space-y-2.5">
          {recentMutations.map((m) => (
            <div
              key={m.id}
              className="item-card rounded-xl p-3.5 hover:bg-slate-800/80 transition-all cursor-pointer border border-slate-800/80 bg-slate-900/60"
              onClick={() => onItemClick(m.asset_id)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-inner">
                    <i className="fas fa-exchange-alt"></i>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {m.asset_brand ? `${m.asset_brand} ` : ''}{m.asset_model_type ?? m.asset_serial_number}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                      <span className="text-slate-300 font-medium">{m.from_site_name || 'Site Awal'}</span>
                      <i className="fas fa-arrow-right text-[10px] text-blue-400"></i>
                      <span className="text-blue-300 font-medium">{m.to_site_name}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <MutationBadge status={m.status} />
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    {formatTime7Days(m.mutation_date)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      </div> {/* End of Dashboard Widgets Wrapper */}
    </div>
  );
};

export default DashboardView;

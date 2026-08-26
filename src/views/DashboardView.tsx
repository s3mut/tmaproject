import { useMemo } from 'react';
import type { AssetDetail, Category, TransactionDetail, Site } from '../types/inventory';
import { transactionStatusConfig } from '../types/inventory';
import { SectionHeader, EmptyState, Select } from '../components/ui';
import { SkeletonCard } from '../components/ui/Skeleton';
import { MutationBadge } from '../components/ui/Badge';
import ItemsView from './ItemsView';
import { groupCategories } from '../utils/categoryGroups';

interface Props {
  assets: AssetDetail[];
  sites: Site[];
  searchValue?: string;
  initialCategory?: string;
  initialStatus?: string;
  initialRegion?: string;
  isShowingItems?: boolean;
  onClearFilters?: () => void;
  transactions?: TransactionDetail[];
  lockedAssetIds?: Set<number>;
  categories: Category[];
  loading: boolean;
  onItemClick: (id: number) => void;
  onCategoryClick: (cat: string) => void;
  onRegionClick?: (reg: string) => void;
  onViewAll?: () => void;
  onStatusClick?: (status: string, category: string, region: string) => void;
}

interface CombinedMovement {
  id: string;
  asset_id: number;
  asset_brand?: string | null;
  asset_model_type?: string | null;
  asset_serial_number: string;
  asset_category_name: string;
  from_site_name: string;
  to_site_name: string;
  mutation_date: string;
  status: string;
  isLoan: boolean;
  transaction_type: string;
}

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
  assets, sites, searchValue = '', initialCategory = 'all', initialStatus = 'all', initialRegion = 'all',
  isShowingItems = false, onClearFilters,
  transactions = [], lockedAssetIds = new Set(), categories, loading, onItemClick, onCategoryClick, onRegionClick, onViewAll, onStatusClick 
}: Props) => {
  const groupedCategories = useMemo(() => groupCategories(categories), [categories]);

  // Map site alias, site code, & site name ke region
  const siteRegionMap = useMemo(() => {
    const map = new Map<string, string>();
    sites.forEach(s => {
      const reg = s.region || 'Tanpa Region';
      if (s.site_code) map.set(s.site_code, reg);
      if (s.site_alias) map.set(s.site_alias, reg);
      if (s.site_name) map.set(s.site_name, reg);
    });
    return map;
  }, [sites]);

  // Ekstrak opsi Region unik dari tabel Sites
  const regionOptions = useMemo(() => {
    const regSet = new Set(sites.map(s => s.region || 'Tanpa Region'));
    return Array.from(regSet).sort();
  }, [sites]);

  // Filter aset di dashboard berdasarkan kategori & region yang dipilih
  const filteredAssets = useMemo(() => {
    let result = assets;
    if (initialCategory !== 'all') {
      result = result.filter(a => a.category_name === initialCategory);
    }
    if (initialRegion !== 'all') {
      result = result.filter(a => {
        const reg = a.site_alias ? (siteRegionMap.get(a.site_alias) || 'Tanpa Region') : 'Tanpa Region';
        return reg === initialRegion;
      });
    }
    return result;
  }, [assets, initialCategory, initialRegion, siteRegionMap]);

  // Transaksi 7 hari terakhir
  const recentMutations = useMemo(() => {
    const combined: CombinedMovement[] = (transactions || []).map(t => ({
      id: `trx-${t.id}`,
      asset_id: t.asset_id || 0,
      asset_brand: t.asset_brand,
      asset_model_type: t.asset_model_type,
      asset_serial_number: t.asset_serial_number || '-',
      asset_category_name: t.asset_category_name || '-',
      from_site_name: t.from_site_name || 'Site Awal',
      to_site_name: t.to_site_name || '-',
      mutation_date: t.requested_at,
      status: t.status,
      isLoan: t.transaction_type === 'Borrowing',
      transaction_type: t.transaction_type,
    }));

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return combined.filter((m) => {
      const mutDate = new Date(m.mutation_date);
      if (mutDate < sevenDaysAgo) return false;
      if (initialCategory !== 'all' && m.asset_category_name !== initialCategory) return false;
      if (initialRegion !== 'all') {
        const regFrom = m.from_site_name ? siteRegionMap.get(m.from_site_name) : null;
        const regTo = m.to_site_name ? siteRegionMap.get(m.to_site_name) : null;
        if (regFrom !== initialRegion && regTo !== initialRegion) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.mutation_date).getTime() - new Date(a.mutation_date).getTime()).slice(0, 5);
  }, [transactions, initialCategory, initialRegion, siteRegionMap]);

  // Hitung stats dari filtered assets
  const stats = useMemo(() => ({
    total:     filteredAssets.length,
    active:    filteredAssets.filter(a => (a.status ?? 'Active') === 'Active').length,
    backup:    filteredAssets.filter(a => a.status === 'Backup').length,
    retired:   filteredAssets.filter(a => a.status === 'Retired').length,
    disposed:  filteredAssets.filter(a => a.status === 'Disposed').length,
    inTransit: (transactions || []).filter(t => t.status === 'In Transit').length,
  }), [filteredAssets, transactions]);

  // Klik stat card: barulah navigasi ke Items dengan status + kategori + region aktif
  const handleStatClick = (status: string) => {
    if (onStatusClick) {
      onStatusClick(status, initialCategory, initialRegion);
    }
  };

  // Tampilkan ItemsView HANYA jika isShowingItems true (diklik dari stat card) atau user mengetik di search bar
  const showItemsView = Boolean(isShowingItems || searchValue.trim() !== '');

  return (
    <div className="fade-in">
      {/* ── ITEMS VIEW COMPONENT (Muncul HANYA jika stat card diklik / ada pencarian) ── */}
      <div className={`transition-all duration-300 ${showItemsView ? 'block' : 'hidden'}`}>
        {showItemsView && (
          <>
            <div className="mb-4 flex items-center justify-between bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl shadow-lg">
              <div>
                <p className="text-sm font-bold text-blue-400">Daftar Aset Terfilter</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {searchValue && `Pencarian: "${searchValue}" `}
                  {initialCategory !== 'all' && `| Kat: ${initialCategory} `}
                  {initialRegion !== 'all' && `| Reg: ${initialRegion} `}
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
              initialRegion={initialRegion}
              lockedAssetIds={lockedAssetIds}
              categories={categories}
              loading={loading}
              onItemClick={onItemClick}
            />
          </>
        )}
      </div>

      {/* ── DASHBOARD WIDGETS (Tampil saat di Beranda) ── */}
      <div className={`transition-all duration-500 ${showItemsView ? 'opacity-0 max-h-0 overflow-hidden' : 'opacity-100 max-h-[9999px]'}`}>
        
        {/* Dropdown Filter Kategori & Region di atas Stats */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wider pl-1">
              <i className="fas fa-filter mr-1.5"></i> Filter Kategori Aset
            </label>
            <Select
              value={initialCategory}
              onChange={(e) => onCategoryClick(e.target.value)}
              className="w-full text-sm py-2.5 bg-slate-800/80 border-slate-700/60 font-semibold shadow-sm"
            >
              <option value="all">📦 Semua Kategori</option>
              {groupedCategories.map((grp) => (
                <optgroup key={grp.label} label={grp.label}>
                  {grp.items.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wider pl-1">
              <i className="fas fa-map-marker-alt mr-1.5"></i> Filter Region Aset
            </label>
            <Select
              value={initialRegion}
              onChange={(e) => onRegionClick && onRegionClick(e.target.value)}
              className="w-full text-sm py-2.5 bg-slate-800/80 border-slate-700/60 font-semibold shadow-sm"
            >
              <option value="all">🌐 Semua Region</option>
              {regionOptions.map((r) => (
                <option key={r} value={r}>
                  📍 Region {r}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div
            className={`stat-card rounded-xl p-4 col-span-2 flex justify-between items-center ${onStatusClick ? 'cursor-pointer hover:ring-1 hover:ring-white/10 transition-all active:scale-[0.99]' : ''}`}
            onClick={() => handleStatClick('all')}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-slate-400">
                  {initialCategory === 'all' && initialRegion === 'all'
                    ? 'Total Aset'
                    : `Total — ${initialCategory !== 'all' ? initialCategory : ''} ${initialRegion !== 'all' ? `(Reg ${initialRegion})` : ''}`}
                </span>
                {(initialCategory !== 'all' || initialRegion !== 'all') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCategoryClick('all');
                      if (onRegionClick) onRegionClick('all');
                    }}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all flex items-center gap-1"
                  >
                    <i className="fas fa-times"></i> Reset Filter
                  </button>
                )}
              </div>
              <p className="text-3xl font-bold text-slate-50">{stats.total}</p>
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
          <StatCard label="Disposed"  value={stats.disposed}  color="text-red-400" icon="fa-trash-alt"
            gradient="linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))" border="rgba(239,68,68,0.2)"
            onClick={() => handleStatClick('Disposed')} />
        </div>

        {/* Aset Terakhir Dipindah (7 Hari Terakhir) */}
        <SectionHeader
          title={initialCategory === 'all' ? 'Terakhir Dipindah (7 Hari)' : `Mutasi — ${initialCategory} (7 Hari)`}
          icon="fa-truck-moving"
          className="mt-2"
          action={onViewAll && !loading ? {
            label: 'Lihat Semua', iconRight: 'fa-arrow-right',
            onClick: () => { onViewAll(); onCategoryClick('all'); },
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
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-inner ${
                      m.isLoan 
                        ? 'bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-purple-400' 
                        : 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-400'
                    }`}>
                      <i className={m.isLoan ? "fas fa-hand-holding-box" : "fas fa-exchange-alt"}></i>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-slate-50 truncate">
                          {m.asset_brand ? `${m.asset_brand} ` : ''}{m.asset_model_type ?? m.asset_serial_number}
                        </h4>
                        {m.isLoan && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                            PINJAM
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                        <span className="text-slate-300 font-medium">{m.from_site_name || 'Site Awal'}</span>
                        <i className="fas fa-arrow-right text-[10px] text-blue-400"></i>
                        <span className="text-blue-300 font-medium">{m.to_site_name}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${transactionStatusConfig[m.status as any]?.bg || 'bg-slate-700'} ${transactionStatusConfig[m.status as any]?.text || 'text-slate-300'}`}>
                      {transactionStatusConfig[m.status as any]?.label || m.status}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">
                      {formatTime7Days(m.mutation_date)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
      </div>
    </div>
  );
};

export default DashboardView;

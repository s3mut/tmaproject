import { useState, useMemo, useEffect } from 'react';
import type { AssetDetail, AssetStatus, Site } from '../types/inventory';
import type { Category } from '../types/inventory';
import ItemCard from '../components/ItemCard';
import { Select } from '../components/ui';
import { groupCategories } from '../utils/categoryGroups';

// Urutan tampilan status yang diinginkan
const STATUS_ORDER: AssetStatus[] = ['Active', 'Backup', 'Repair', 'Retired', 'Disposed', 'In Transit'];

interface Props {
  assets: AssetDetail[];
  sites: Site[];
  searchValue: string;
  loading: boolean;
  initialCategory?: string;
  initialStatus?: string;
  initialRegion?: string;
  lockedAssetIds?: Set<number>;
  categories?: Category[];
  onItemClick: (id: number) => void;
}

// ── Region Accordion Card ─────────────────────────────────────────────────────
interface RegionCardProps {
  region: string;
  regionAssets: AssetDetail[];
  lockedAssetIds?: Set<number>;
  defaultOpen: boolean;
  onItemClick: (id: number) => void;
}

const STATUS_COLOR: Record<string, string> = {
  Active:     'text-emerald-400',
  Backup:     'text-blue-400',
  Repair:     'text-yellow-400',
  Retired:    'text-slate-500',
  Disposed:   'text-red-400',
  'In Transit': 'text-purple-400',
};

const RegionCard = ({ region, regionAssets, lockedAssetIds, defaultOpen, onItemClick }: RegionCardProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const [hasRendered, setHasRendered] = useState(defaultOpen);

  // Jika defaultOpen berubah (karena filter/search berubah), sync state
  useEffect(() => {
    setOpen(defaultOpen);
    if (defaultOpen) setHasRendered(true);
  }, [defaultOpen]);

  // Lazy render: Tandai pernah dirender jika dibuka
  useEffect(() => {
    if (open) setHasRendered(true);
  }, [open]);

  // Hitung breakdown status untuk badge summary
  const statusSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    regionAssets.forEach(a => {
      const s = a.status ?? 'Active';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .sort(([a], [b]) => STATUS_ORDER.indexOf(a as AssetStatus) - STATUS_ORDER.indexOf(b as AssetStatus));
  }, [regionAssets]);

  return (
    <div className={`glass rounded-2xl overflow-hidden transition-all duration-200 ${open ? 'shadow-lg shadow-black/20' : ''}`}>
      {/* Header — klik untuk toggle */}
      <button
        className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/5 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        {/* Kiri: Icon + Nama region */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
            region === 'Tanpa Region' ? 'bg-slate-700 text-slate-500' : 'bg-red-500/15 text-red-400'
          }`}>
            <i className={`fas ${region === 'Tanpa Region' ? 'fa-question-circle' : 'fa-map-marker-alt'} text-sm`}></i>
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-bold text-slate-50 truncate">{region}</p>
            {/* Badge breakdown status */}
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {statusSummary.map(([status, count]) => (
                <span key={status} className={`text-[10px] font-medium ${STATUS_COLOR[status] ?? 'text-slate-400'}`}>
                  {count} {status}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Kanan: total + chevron */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          <span className="text-xs font-semibold text-slate-50 bg-slate-700 px-2.5 py-1 rounded-full">
            {regionAssets.length}
          </span>
          <i className={`fas fa-chevron-down text-slate-400 text-xs transition-transform duration-300 ${open ? 'rotate-180' : ''}`}></i>
        </div>
      </button>

      {/* Content — animated expand (LAZY RENDERED) */}
      <div className={`transition-all duration-300 overflow-hidden ${open ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-3 pb-3 space-y-2 border-t border-slate-700/50 pt-3">
          {hasRendered && regionAssets.map((a) => (
            <ItemCard key={a.id} item={a} isLocked={lockedAssetIds?.has(a.id)} onClick={onItemClick} />
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Main View ─────────────────────────────────────────────────────────────────
const ItemsView = ({ assets, sites, searchValue, loading, initialCategory, initialStatus, initialRegion, lockedAssetIds, categories = [], onItemClick }: Props) => {
  const [activeFilter, setActiveFilter] = useState<AssetStatus | 'all'>(
    (initialStatus && initialStatus !== 'all') ? initialStatus as AssetStatus : 'all'
  );
  const [activeRegion, setActiveRegion] = useState<string>(
    (initialRegion && initialRegion !== 'all') ? initialRegion : 'all'
  );
  const [activeCategory, setActiveCategory] = useState<string>(
    (initialCategory && initialCategory !== 'all') ? initialCategory : 'all'
  );

  // Sync filter saat initialStatus atau initialCategory berubah (dari klik stat card Dashboard)
  useEffect(() => {
    if (initialStatus && initialStatus !== 'all') {
      setActiveFilter(initialStatus as AssetStatus);
    } else {
      setActiveFilter('all');
    }
  }, [initialStatus]);

  useEffect(() => {
    if (initialCategory && initialCategory !== 'all') {
      setActiveCategory(initialCategory);
    } else {
      setActiveCategory('all');
    }
  }, [initialCategory]);

  useEffect(() => {
    if (initialRegion && initialRegion !== 'all') {
      setActiveRegion(initialRegion);
    } else {
      setActiveRegion('all');
    }
  }, [initialRegion]);

  // Ekstrak opsi Region unik dari tabel Sites
  const regionOptions = useMemo(() => {
    const regSet = new Set(sites.map(s => s.region || 'Tanpa Region'));
    return Array.from(regSet).sort();
  }, [sites]);
  
  const siteRegionMap = useMemo(() => new Map(sites.map(s => [s.site_alias, s.region || 'Tanpa Region'])), [sites]);

  const groupedCategories = useMemo(() => groupCategories(categories), [categories]);

  // Build dynamic status filter chips dari data aktual di database
  const statusFilters = useMemo(() => [
    { key: 'all' as const, label: 'Semua' },
    ...STATUS_ORDER
      .filter((s) => assets.some((a) => (a.status ?? 'Active') === s))
      .map((s) => ({ key: s, label: s })),
  ], [assets]);

  const filtered = useMemo(() => {
    let result = assets;

    // Filter kategori
    if (activeCategory !== 'all') {
      result = result.filter((a) => a.category_name === activeCategory);
    }

    // Filter Region
    if (activeRegion !== 'all') {
      result = result.filter((a) => {
        const r = a.site_alias ? (siteRegionMap.get(a.site_alias) || 'Tanpa Region') : 'Tanpa Region';
        return r === activeRegion;
      });
    }

    // Filter status — case-insensitive + null dianggap 'Active'
    if (activeFilter !== 'all') {
      result = result.filter((a) =>
        (a.status ?? 'Active').toLowerCase() === activeFilter.toLowerCase()
      );
    }

    // Filter pencarian
    if (searchValue.trim()) {
      const term = searchValue.toLowerCase();
      result = result.filter((a) =>
        a.serial_number.toLowerCase().includes(term) ||
        (a.brand ?? '').toLowerCase().includes(term) ||
        (a.model_type ?? '').toLowerCase().includes(term) ||
        (a.computer_name ?? '').toLowerCase().includes(term) ||
        (a.site_name ?? '').toLowerCase().includes(term) ||
        (a.category_name ?? '').toLowerCase().includes(term)
      );
    }
    return result;
  }, [assets, activeFilter, activeRegion, searchValue, activeCategory, siteRegionMap]);

  // Group by region
  const groupedAssets = useMemo(() => {
    const siteRegionMap = new Map(sites.map(s => [s.site_alias, s.region || 'Tanpa Region']));
    const groups: Record<string, AssetDetail[]> = {};
    filtered.forEach(a => {
      const region = a.site_alias ? (siteRegionMap.get(a.site_alias) || 'Tanpa Region') : 'Tanpa Region';
      if (!groups[region]) groups[region] = [];
      groups[region].push(a);
    });
    return groups;
  }, [filtered, sites]);

  // Sorted region entries
  const sortedRegions = useMemo(() =>
    Object.entries(groupedAssets).sort(([rA], [rB]) => {
      if (rA === 'Tanpa Region') return 1;
      if (rB === 'Tanpa Region') return -1;
      return rA.localeCompare(rB);
    }),
  [groupedAssets]);

  // Apakah sedang ada filter/pencarian aktif? → expand semua region agar hasil terlihat
  const hasActiveFilter = activeFilter !== 'all' || !!searchValue.trim() || activeCategory !== 'all';

  // Default: hanya region pertama yang terbuka saat tidak ada filter
  const defaultOpenRegions = useMemo(() => {
    if (hasActiveFilter) return new Set(sortedRegions.map(([r]) => r)); // buka semua
    const first = sortedRegions[0]?.[0];
    return first ? new Set([first]) : new Set<string>();
  }, [sortedRegions, hasActiveFilter]);

  return (
    <div className="fade-in">
      {/* Filter Options */}
      <div className="mb-3 space-y-2.5">
        {/* Dropdown Filter Region & Kategori */}
        <div className="flex gap-2 px-1">
          <Select
            value={activeRegion}
            onChange={(e) => setActiveRegion(e.target.value)}
            className="flex-1 text-xs py-2 bg-slate-800/80 border-slate-700/60 font-semibold"
          >
            <option value="all">🌍 Semua Wilayah</option>
            {regionOptions.map(r => (
              <option key={r} value={r}>📍 {r}</option>
            ))}
          </Select>

          {categories.length > 0 && (
            <Select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="flex-1 text-xs py-2 bg-slate-800/80 border-slate-700/60 font-semibold"
            >
              <option value="all">📦 Semua Kategori</option>
              {groupedCategories.map(grp => (
                <optgroup key={grp.label} label={grp.label}>
                  {grp.items.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </optgroup>
              ))}
            </Select>
          )}
        </div>

        {/* Chips Filter Status */}
        <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-hide">
          {statusFilters.map(({ key, label }) => (
            <button
              key={key}
              className={`filter-chip ${activeFilter === key ? 'active' : ''}`}
              onClick={() => setActiveFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Counter hasil */}
      {!loading && (
        <p className="text-xs text-slate-500 mb-4">
          {filtered.length === assets.length
            ? `${assets.length} aset • ${sortedRegions.length} region`
            : <><span className="text-blue-400 font-semibold">{filtered.length}</span> dari {assets.length} aset</>
          }
          {activeCategory !== 'all' && (
            <span className="ml-1 text-slate-600">• Kategori: <span className="text-slate-400">{activeCategory}</span></span>
          )}
          {activeFilter !== 'all' && (
            <span className="ml-1 text-slate-600">• Status: <span className="text-slate-400">{activeFilter}</span></span>
          )}
        </p>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass rounded-2xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-700"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-700 rounded w-1/3"></div>
                  <div className="h-2.5 bg-slate-700 rounded w-1/2"></div>
                </div>
                <div className="w-7 h-6 rounded-full bg-slate-700"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-server text-3xl text-slate-600"></i>
          </div>
          <p className="text-slate-500 text-sm">Tidak ada aset ditemukan</p>
          {(activeFilter !== 'all' || !!searchValue) && (
            <button
              onClick={() => setActiveFilter('all')}
              className="mt-3 text-xs text-blue-400 hover:text-blue-300"
            >
              Reset filter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedRegions.map(([region, regionAssets]) => (
            <RegionCard
              key={region}
              region={region}
              regionAssets={regionAssets}
              lockedAssetIds={lockedAssetIds}
              defaultOpen={defaultOpenRegions.has(region)}
              onItemClick={onItemClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ItemsView;

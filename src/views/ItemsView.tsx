import { useState, useMemo } from 'react';
import type { AssetDetail, AssetStatus, Site } from '../types/inventory';
import ItemCard from '../components/ItemCard';

// Urutan tampilan status yang diinginkan
const STATUS_ORDER: AssetStatus[] = ['Active', 'Backup', 'Repair', 'Retired', 'Disposed', 'In Transit'];

interface Props {
  assets: AssetDetail[];
  sites: Site[];
  searchValue: string;
  loading: boolean;
  initialCategory?: string;
  onItemClick: (id: number) => void;
}

const ItemsView = ({ assets, sites, searchValue, loading, initialCategory, onItemClick }: Props) => {
  const [activeFilter, setActiveFilter] = useState<AssetStatus | 'all'>('all');

  // Build dynamic status filter chips dari data aktual di database
  const statusFilters = useMemo(() => [
    { key: 'all' as const, label: 'Semua' },
    ...STATUS_ORDER
      .filter((s) => assets.some((a) => (a.status ?? 'Active') === s))
      .map((s) => ({ key: s, label: s })),
  ], [assets]);

  const filtered = useMemo(() => {
    let result = assets;

    // Filter kategori (dari klik dashboard)
    if (initialCategory && initialCategory !== 'all') {
      result = result.filter((a) => a.category_name === initialCategory);
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
  }, [assets, activeFilter, searchValue, initialCategory]);

  const groupedAssets = useMemo(() => {
    // Map sites to easy lookup for regions
    const siteRegionMap = new Map(sites.map(s => [s.site_alias, s.region || 'Tanpa Region']));
    
    // Group filtered assets
    const groups: Record<string, AssetDetail[]> = {};
    filtered.forEach(a => {
      const region = a.site_alias ? (siteRegionMap.get(a.site_alias) || 'Tanpa Region') : 'Tanpa Region';
      if (!groups[region]) groups[region] = [];
      groups[region].push(a);
    });

    return groups;
  }, [filtered, sites]);

  return (
    <div className="fade-in">
      {/* Filter Chips — dinamis dari data database */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
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

      {/* Counter hasil */}
      {!loading && (
        <p className="text-xs text-slate-500 mb-4">
          {filtered.length === assets.length
            ? `${assets.length} aset`
            : <><span className="text-blue-400 font-semibold">{filtered.length}</span> dari {assets.length} aset</>
          }
          {initialCategory && initialCategory !== 'all' && (
            <span className="ml-1 text-slate-600">• Kategori: <span className="text-slate-400">{initialCategory}</span></span>
          )}
        </p>
      )}

      {loading ? (
        <div className="text-center py-12">
          <i className="fas fa-spinner fa-spin text-2xl text-blue-400 mb-3 block"></i>
          <p className="text-slate-500 text-sm">Memuat data aset...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-server text-3xl text-slate-600"></i>
          </div>
          <p className="text-slate-500 text-sm">Tidak ada aset ditemukan</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedAssets)
            .sort(([regionA], [regionB]) => {
              if (regionA === 'Tanpa Region') return 1;
              if (regionB === 'Tanpa Region') return -1;
              return regionA.localeCompare(regionB);
            })
            .map(([region, regionAssets]) => (
            <div key={region} className="space-y-3">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <i className="fas fa-map-marker-alt text-red-400"></i>
                {region}
                <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                  {regionAssets.length}
                </span>
              </h3>
              {regionAssets.map((a) => (
                <ItemCard key={a.id} item={a} onClick={onItemClick} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ItemsView;

import { useState, useMemo } from 'react';
import type { AssetDetail, AssetStatus } from '../types/inventory';
import ItemCard from '../components/ItemCard';

// Urutan tampilan status yang diinginkan
const STATUS_ORDER: AssetStatus[] = ['Active', 'Backup', 'Broken', 'Repair'];

interface Props {
  assets: AssetDetail[];
  searchValue: string;
  loading: boolean;
  initialCategory?: string;
  onItemClick: (id: number) => void;
}

const ItemsView = ({ assets, searchValue, loading, initialCategory, onItemClick }: Props) => {
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
      result = result.filter((a) => a.category === initialCategory);
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
        a.category.toLowerCase().includes(term)
      );
    }
    return result;
  }, [assets, activeFilter, searchValue, initialCategory]);

  return (
    <div className="fade-in">
      {/* Filter Chips — dinamis dari data database */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
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
        <div className="space-y-3">
          {filtered.map((a) => <ItemCard key={a.id} item={a} onClick={onItemClick} />)}
        </div>
      )}
    </div>
  );
};

export default ItemsView;

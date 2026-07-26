import { useState, useMemo } from 'react';
import type { AssetDetail, AssetStatus } from '../types/inventory';
import ItemCard from '../components/ItemCard';

type FilterType = AssetStatus | 'all';

const filters: { key: FilterType; label: string }[] = [
  { key: 'all',    label: 'Semua'  },
  { key: 'Active', label: 'Active' },
  { key: 'Backup', label: 'Backup' },
  { key: 'Broken', label: 'Broken' },
  { key: 'Repair', label: 'Repair' },
];

interface Props {
  assets: AssetDetail[];
  searchValue: string;
  loading: boolean;
  initialCategory?: string;
  onItemClick: (id: number) => void;
}

const ItemsView = ({ assets, searchValue, loading, initialCategory, onItemClick }: Props) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filtered = useMemo(() => {
    let result = assets;
    if (initialCategory && initialCategory !== 'all') {
      result = result.filter((a) => a.category === initialCategory);
    }
    if (activeFilter !== 'all') {
      result = result.filter((a) => a.status === activeFilter);
    }
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
      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {filters.map(({ key, label }) => (
          <button key={key} className={`filter-chip ${activeFilter === key ? 'active' : ''}`}
            onClick={() => setActiveFilter(key)}>
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

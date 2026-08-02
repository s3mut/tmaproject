import { useState, useMemo } from 'react';
import type { AssetDetail, Category } from '../types/inventory';
import ItemCard from '../components/ItemCard';

interface Props {
  assets: AssetDetail[];
  categories: Category[];
  loading: boolean;
  onItemClick: (id: number) => void;
  onCategoryClick: (cat: string) => void;
  onViewAll?: () => void;
  onStatusClick?: (status: string, category: string) => void;
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

const SkeletonCard = () => (
  <div className="item-card rounded-xl p-4 animate-pulse">
    <div className="flex gap-3">
      <div className="w-10 h-10 rounded-lg bg-slate-700"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-700 rounded w-3/4"></div>
        <div className="h-3 bg-slate-700 rounded w-1/2"></div>
      </div>
    </div>
  </div>
);

const SkeletonCategory = () => (
  <div className="flex-shrink-0 text-center animate-pulse">
    <div className="w-12 h-12 rounded-xl bg-slate-700 mx-auto mb-1"></div>
    <div className="h-2 bg-slate-700 rounded w-10 mx-auto"></div>
  </div>
);

const DashboardView = ({ assets, categories, loading, onItemClick, onCategoryClick: _onCategoryClick, onViewAll, onStatusClick }: Props) => {
  const [selectedCat, setSelectedCat] = useState<string>('all');

  // Filter aset berdasarkan kategori yang dipilih
  const filteredAssets = useMemo(() => {
    if (selectedCat === 'all') return assets;
    return assets.filter(a => a.category_name === selectedCat);
  }, [assets, selectedCat]);

  // Hitung stats dari filtered assets
  const stats = useMemo(() => ({
    total:     filteredAssets.length,
    active:    filteredAssets.filter(a => a.status === 'Active').length,
    backup:    filteredAssets.filter(a => a.status === 'Backup').length,
    retired:   filteredAssets.filter(a => a.status === 'Retired').length,
    repair:    filteredAssets.filter(a => a.status === 'Repair').length,
    inTransit: filteredAssets.filter(a => a.status === 'In Transit').length,
  }), [filteredAssets]);

  const recentAssets = filteredAssets.slice(0, 5);

  // Klik kategori: hanya update filter stats di Dashboard (TIDAK navigasi ke tab Items)
  const handleCatSelect = (catName: string) => {
    setSelectedCat(catName);
  };

  // Klik stat card: navigasi ke Items dengan status + kategori aktif
  const handleStatClick = (status: string) => {
    if (onStatusClick) onStatusClick(status, selectedCat);
  };

  return (
    <div className="fade-in">
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
                {selectedCat === 'all' ? 'Total Aset' : `Total — ${selectedCat}`}
              </span>
              {selectedCat !== 'all' && (
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedCat('all'); }}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all flex items-center gap-1"
                >
                  <i className="fas fa-times"></i> Reset
                </button>
              )}
            </div>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
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

      {/* Categories — dinamis dari database */}
      <h2 className="text-sm font-semibold text-slate-300 mb-3">Kategori</h2>
      <div className="flex gap-3 overflow-x-auto pb-4 mb-4 scrollbar-hide pr-16">
        {loading ? (
          [1, 2, 3, 4].map((i) => <SkeletonCategory key={i} />)
        ) : (
          <>
            {/* Chip: Semua */}
            <div
              className="flex-shrink-0 text-center cursor-pointer"
              onClick={() => setSelectedCat('all')}
            >
              <div className={`category-icon mx-auto mb-1 transition-all ${
                selectedCat === 'all'
                  ? 'bg-blue-500 text-white ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900'
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                <i className="fas fa-th-large"></i>
              </div>
              <span className={`text-xs transition-colors ${selectedCat === 'all' ? 'text-blue-400 font-semibold' : 'text-slate-400'}`}>
                Semua
              </span>
            </div>

            {/* Chip: Per kategori */}
            {categories.map((cat) => {
              const isActive = selectedCat === cat.name;
              return (
                <div
                  key={cat.id}
                  className="flex-shrink-0 text-center cursor-pointer"
                  onClick={() => handleCatSelect(cat.name)}
                >
                  <div className={`category-icon mx-auto mb-1 transition-all ${
                    isActive
                      ? `${cat.color_bg.replace('/20', '')} ${cat.color_text} ring-2 ring-offset-2 ring-offset-slate-900 ${cat.color_text.replace('text-', 'ring-')}`
                      : `${cat.color_bg} ${cat.color_text}`
                  }`}>
                    <i className={`fas ${cat.icon}`}></i>
                  </div>
                  <span className={`text-xs transition-colors ${isActive ? `${cat.color_text} font-semibold` : 'text-slate-400'}`}>
                    {cat.name}
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Recent Assets */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-300">
          {selectedCat === 'all' ? 'Aset Terbaru' : `Aset — ${selectedCat}`}
        </h2>
        {onViewAll && !loading && assets.length > 0 && (
          <button
            onClick={() => { onViewAll(); setSelectedCat('all'); }}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            Lihat Semua <i className="fas fa-arrow-right text-[10px]"></i>
          </button>
        )}
      </div>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : recentAssets.length === 0 ? (
        <div className="text-center py-8">
          <i className="fas fa-server text-3xl text-slate-700 mb-3 block"></i>
          <p className="text-slate-500 text-sm">
            {selectedCat === 'all' ? 'Belum ada aset terdaftar' : `Tidak ada aset kategori "${selectedCat}"`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentAssets.map((a) => <ItemCard key={a.id} item={a} onClick={onItemClick} />)}
        </div>
      )}
    </div>
  );
};

export default DashboardView;

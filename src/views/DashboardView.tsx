import { useState, useMemo } from 'react';
import type { AssetDetail, Category, MutationDetail } from '../types/inventory';

interface Props {
  assets: AssetDetail[];
  mutations?: MutationDetail[];
  categories: Category[];
  loading: boolean;
  onItemClick: (id: number) => void;
  onCategoryClick: (cat: string) => void;
  onViewAll?: () => void;
  onStatusClick?: (status: string, category: string) => void;
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

const DashboardView = ({ assets, mutations = [], categories, loading, onItemClick, onCategoryClick: _onCategoryClick, onViewAll, onStatusClick }: Props) => {
  const [selectedCat, setSelectedCat] = useState<string>('all');

  // Filter aset berdasarkan kategori yang dipilih
  const filteredAssets = useMemo(() => {
    if (selectedCat === 'all') return assets;
    return assets.filter(a => a.category_name === selectedCat);
  }, [assets, selectedCat]);

  // Filter mutasi 7 hari terakhir
  const recentMutations = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return (mutations || []).filter((m) => {
      const mutDate = new Date(m.mutation_date);
      const isWithin7Days = mutDate >= sevenDaysAgo;
      if (!isWithin7Days) return false;
      if (selectedCat !== 'all' && m.asset_category_name !== selectedCat) return false;
      return true;
    }).slice(0, 5);
  }, [mutations, selectedCat]);

  // Hitung stats dari filtered assets
  const stats = useMemo(() => ({
    total:     filteredAssets.length,
    active:    filteredAssets.filter(a => a.status === 'Active').length,
    backup:    filteredAssets.filter(a => a.status === 'Backup').length,
    retired:   filteredAssets.filter(a => a.status === 'Retired').length,
    repair:    filteredAssets.filter(a => a.status === 'Repair').length,
    inTransit: filteredAssets.filter(a => a.status === 'In Transit').length,
  }), [filteredAssets]);

  // Klik kategori: hanya update filter stats di Dashboard
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

      {/* Aset Terakhir Dipindah (7 Hari Terakhir) */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <i className="fas fa-truck-moving text-blue-400"></i>
          {selectedCat === 'all' ? 'Terakhir Dipindah (7 Hari)' : `Mutasi — ${selectedCat} (7 Hari)`}
        </h2>
        {onViewAll && !loading && (
          <button
            onClick={() => { onViewAll(); setSelectedCat('all'); }}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors font-medium"
          >
            Lihat Semua <i className="fas fa-arrow-right text-[10px]"></i>
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : recentMutations.length === 0 ? (
        <div className="text-center py-8 glass rounded-2xl border border-slate-800">
          <i className="fas fa-exchange-alt text-3xl text-slate-700 mb-3 block"></i>
          <p className="text-slate-400 text-sm font-medium">
            Tidak ada perpindahan aset dalam 7 hari terakhir
          </p>
          <p className="text-slate-600 text-xs mt-1">
            Riwayat mutasi akan muncul di sini secara otomatis.
          </p>
        </div>
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
                      <h4 className="text-sm font-semibold text-white truncate">
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
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-block ${
                    m.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    m.status === 'Pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {m.status}
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
  );
};

export default DashboardView;

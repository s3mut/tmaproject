import type { AssetDetail, Category } from '../types/inventory';
import ItemCard from '../components/ItemCard';

interface Stats { total: number; active: number; backup: number; broken: number; repair: number; inTransit: number; }

interface Props {
  stats: Stats;
  assets: AssetDetail[];
  categories: Category[];
  loading: boolean;
  onItemClick: (id: number) => void;
  onCategoryClick: (cat: string) => void;
}

const StatCard = ({ label, value, color, icon, gradient, border }: {
  label: string; value: number; color: string; icon: string; gradient: string; border: string;
}) => (
  <div className="rounded-xl p-4" style={{ background: gradient, borderWidth: 1, borderStyle: 'solid', borderColor: border }}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-slate-400">{label}</span>
      <div className={`category-icon ${color.replace('text-', 'bg-').replace('-400', '-500/20').replace('-600', '-500/20')} ${color}`} style={{ width: 32, height: 32, fontSize: '0.9rem' }}>
        <i className={`fas ${icon}`}></i>
      </div>
    </div>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
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

const DashboardView = ({ stats, assets, categories, loading, onItemClick, onCategoryClick }: Props) => {
  const recentAssets = [...assets].slice(0, 5);

  return (
    <div className="fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="stat-card rounded-xl p-4 col-span-2 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-slate-400">Total Aset Aktif</span>
            </div>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 mb-1">In Transit</div>
            <p className="text-xl font-bold text-blue-400">{stats.inTransit}</p>
          </div>
        </div>

        <StatCard label="Active"  value={stats.active}  color="text-green-400"  icon="fa-check-circle"
          gradient="linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.05))" border="rgba(34,197,94,0.2)" />
        <StatCard label="Backup"  value={stats.backup}  color="text-blue-400"   icon="fa-archive"
          gradient="linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.05))" border="rgba(59,130,246,0.2)" />
        <StatCard label="Broken"  value={stats.broken}  color="text-red-400"    icon="fa-times-circle"
          gradient="linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))" border="rgba(239,68,68,0.2)" />
        <StatCard label="Repair"  value={stats.repair}  color="text-yellow-400" icon="fa-tools"
          gradient="linear-gradient(135deg, rgba(234,179,8,0.1), rgba(234,179,8,0.05))" border="rgba(234,179,8,0.2)" />
      </div>

      {/* Categories — dinamis dari database */}
      <h2 className="text-sm font-semibold text-slate-300 mb-3">Kategori</h2>
      <div className="flex gap-3 overflow-x-auto pb-4 mb-4 scrollbar-hide pr-16">
        {loading ? (
          [1, 2, 3, 4].map((i) => <SkeletonCategory key={i} />)
        ) : (
          <>
            <div className="flex-shrink-0 text-center cursor-pointer" onClick={() => onCategoryClick('all')}>
              <div className="category-icon bg-blue-500/20 text-blue-400 mx-auto mb-1">
                <i className="fas fa-th-large"></i>
              </div>
              <span className="text-xs text-slate-400">Semua</span>
            </div>
            {categories.map((cat) => (
              <div key={cat.id} className="flex-shrink-0 text-center cursor-pointer" onClick={() => onCategoryClick(cat.name)}>
                <div className={`category-icon ${cat.color_bg} ${cat.color_text} mx-auto mb-1`}>
                  <i className={`fas ${cat.icon}`}></i>
                </div>
                <span className="text-xs text-slate-400">{cat.name}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Recent Assets */}
      <h2 className="text-sm font-semibold text-slate-300 mb-3">Aset Terbaru</h2>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : recentAssets.length === 0 ? (
        <div className="text-center py-8">
          <i className="fas fa-server text-3xl text-slate-700 mb-3 block"></i>
          <p className="text-slate-500 text-sm">Belum ada aset terdaftar</p>
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

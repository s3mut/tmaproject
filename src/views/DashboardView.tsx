import type { AssetDetail } from '../types/inventory';
import ItemCard from '../components/ItemCard';

const CATEGORIES = [
  { key: 'all',          label: 'Semua',    icon: 'fa-th-large', color: 'text-blue-400',    bg: 'bg-blue-500/20' },
  { key: 'Laptop',       label: 'Laptop',   icon: 'fa-laptop',   color: 'text-purple-400',  bg: 'bg-purple-500/20' },
  { key: 'Monitor',      label: 'Monitor',  icon: 'fa-desktop',  color: 'text-cyan-400',    bg: 'bg-cyan-500/20' },
  { key: 'Printer',      label: 'Printer',  icon: 'fa-print',    color: 'text-orange-400',  bg: 'bg-orange-500/20' },
  { key: 'Network',      label: 'Network',  icon: 'fa-wifi',     color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  { key: 'Accessories',  label: 'Aksesoris',icon: 'fa-keyboard', color: 'text-pink-400',    bg: 'bg-pink-500/20' },
];

interface Stats { total: number; active: number; backup: number; broken: number; repair: number; }

interface Props {
  stats: Stats;
  assets: AssetDetail[];
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
      <div className={`category-icon ${color.replace('text-', 'bg-').replace('-400', '-500/20')} ${color}`} style={{ width: 32, height: 32, fontSize: '0.9rem' }}>
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

const DashboardView = ({ stats, assets, loading, onItemClick, onCategoryClick }: Props) => {
  const recentAssets = [...assets].slice(0, 5);

  return (
    <div className="fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="stat-card rounded-xl p-4 col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Total Aset</span>
            <div className="category-icon bg-blue-500/20 text-blue-400" style={{ width: 32, height: 32, fontSize: '0.9rem' }}>
              <i className="fas fa-server"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-slate-500 mt-1">semua kategori</p>
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

      {/* Categories */}
      <h2 className="text-sm font-semibold text-slate-300 mb-3">Kategori</h2>
      <div className="flex gap-3 overflow-x-auto pb-4 mb-4 scrollbar-hide">
        {CATEGORIES.map(({ key, label, icon, color, bg }) => (
          <div key={key} className="flex-shrink-0 text-center cursor-pointer" onClick={() => onCategoryClick(key)}>
            <div className={`category-icon ${bg} ${color} mx-auto mb-1`}>
              <i className={`fas ${icon}`}></i>
            </div>
            <span className="text-xs text-slate-400">{label}</span>
          </div>
        ))}
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

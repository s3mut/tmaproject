import { useMemo } from 'react';
import type { AssetDetail, TransactionDetail } from '../types/inventory';
import { transactionStatusConfig } from '../types/inventory';
import { SectionHeader, EmptyState } from '../components/ui';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  assets: AssetDetail[];
  transactions?: TransactionDetail[];
  loading: boolean;
  onItemClick: (id: number) => void;
  onViewAll?: () => void;
}

interface CombinedMovement {
  id: string;
  asset_id: number;
  asset_brand?: string | null;
  asset_model_type?: string | null;
  asset_serial_number: string;
  from_site_name: string;
  to_site_name: string;
  mutation_date: string;
  status: string;
  isLoan: boolean;
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

const StatCard = ({ label, value, color, icon, bgGradient, shadowColor }: {
  label: string; value: number; color: string; icon: string; bgGradient: string; shadowColor: string;
}) => (
  <div className={`glass rounded-3xl p-5 relative overflow-hidden shadow-lg ${shadowColor} border border-white/20 dark:border-slate-700/50`}>
    <div className={`absolute top-0 right-0 w-32 h-32 opacity-20 blur-2xl rounded-full ${bgGradient} -mr-10 -mt-10 pointer-events-none`}></div>
    <div className="flex items-center justify-between mb-3 relative z-10">
      <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{label}</span>
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${color} bg-white/50 dark:bg-slate-800/50 shadow-sm border border-white/50 dark:border-slate-700`}>
        <i className={`fas ${icon}`}></i>
      </div>
    </div>
    <p className={`text-4xl font-black ${color} relative z-10 tracking-tight`}>{value}</p>
  </div>
);

const DashboardView = ({ assets, transactions = [], loading, onItemClick, onViewAll }: Props) => {
  const { currentUser } = useAuth();
  
  // Transaksi 7 hari terakhir
  const recentMutations = useMemo(() => {
    const combined: CombinedMovement[] = (transactions || []).map(t => ({
      id: `trx-${t.id}`,
      asset_id: t.asset_id || 0,
      asset_brand: t.asset_brand,
      asset_model_type: t.asset_model_type,
      asset_serial_number: t.asset_serial_number || '-',
      from_site_name: t.from_site_name || 'Site Awal',
      to_site_name: t.to_site_name || '-',
      mutation_date: t.requested_at,
      status: t.status,
      isLoan: t.transaction_type === 'Borrowing',
    }));

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return combined
      .filter((m) => new Date(m.mutation_date) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.mutation_date).getTime() - new Date(a.mutation_date).getTime())
      .slice(0, 5);
  }, [transactions]);

  // Hitung stats
  const stats = useMemo(() => ({
    total:     assets.length,
    active:    assets.filter(a => (a.status ?? 'Active') === 'Active').length,
    inTransit: (transactions || []).filter(t => t.status === 'In Transit').length,
    disposed:  assets.filter(a => a.status === 'Disposed').length,
  }), [assets, transactions]);

  // Sapaan berdasarkan waktu
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  return (
    <div className="fade-in max-w-md mx-auto space-y-6">
      {/* Sapaan User */}
      <div className="pt-2 pb-2">
        <h2 className="text-xl font-medium text-slate-500 dark:text-slate-400">
          {getGreeting()},
        </h2>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-50 mt-1">
          {currentUser?.name || 'Pengguna'}
        </h1>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Aset" value={stats.total} color="text-blue-600 dark:text-blue-400" icon="fa-boxes"
          bgGradient="bg-blue-500" shadowColor="shadow-blue-500/10" />
        <StatCard label="Active" value={stats.active} color="text-emerald-600 dark:text-emerald-400" icon="fa-check-circle"
          bgGradient="bg-emerald-500" shadowColor="shadow-emerald-500/10" />
        <StatCard label="In Transit" value={stats.inTransit} color="text-purple-600 dark:text-purple-400" icon="fa-truck"
          bgGradient="bg-purple-500" shadowColor="shadow-purple-500/10" />
        <StatCard label="Disposed" value={stats.disposed} color="text-red-600 dark:text-red-400" icon="fa-trash-alt"
          bgGradient="bg-red-500" shadowColor="shadow-red-500/10" />
      </div>

      {/* Aset Terakhir Dipindah (7 Hari Terakhir) */}
      <div className="pt-2">
        <SectionHeader
          title="Aktivitas Terakhir"
          icon="fa-bolt"
          className="mb-4"
          action={onViewAll && !loading ? {
            label: 'Lihat Semua', iconRight: 'fa-arrow-right',
            onClick: onViewAll,
          } : undefined}
        />

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : recentMutations.length === 0 ? (
          <EmptyState
            icon="fa-coffee"
            title="Belum ada aktivitas mutasi"
            description="Riwayat perpindahan aset dalam 7 hari terakhir akan muncul di sini."
          />
        ) : (
          <div className="space-y-3">
            {recentMutations.map((m) => (
              <div
                key={m.id}
                className="glass rounded-3xl p-4 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all cursor-pointer border border-slate-200/50 dark:border-slate-800/50 active:scale-[0.98]"
                onClick={() => onItemClick(m.asset_id)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg shadow-sm border ${
                      m.isLoan 
                        ? 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400' 
                        : 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
                    }`}>
                      <i className={m.isLoan ? "fas fa-hand-holding-box" : "fas fa-exchange-alt"}></i>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-[15px] font-bold text-slate-900 dark:text-slate-50 truncate">
                          {m.asset_brand ? `${m.asset_brand} ` : ''}{m.asset_model_type ?? m.asset_serial_number}
                        </h4>
                        {m.isLoan && (
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                            PINJAM
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                        <span className="font-medium truncate">{m.from_site_name || 'Site Awal'}</span>
                        <i className="fas fa-arrow-right text-[10px] text-slate-300 dark:text-slate-600 shrink-0"></i>
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{m.to_site_name}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 flex flex-col items-end">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${transactionStatusConfig[m.status as keyof typeof transactionStatusConfig]?.bg || 'bg-slate-100 dark:bg-slate-800'} ${transactionStatusConfig[m.status as keyof typeof transactionStatusConfig]?.text || 'text-slate-600 dark:text-slate-400'}`}>
                      {transactionStatusConfig[m.status as keyof typeof transactionStatusConfig]?.label || m.status}
                    </span>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
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

import { useState } from 'react';
import type { TransactionDetail, Site, Category } from '../types/inventory';
import { transactionStatusConfig } from '../types/inventory';
import { Button } from '../components/ui';

interface Props {
  transactions: TransactionDetail[];
  sites: Site[];
  categories: Category[];
  loading: boolean;
  userRole?: string;
  currentUserId: number;
  currentUserRegion?: string;
  onCreateTransaction: () => void;
  onRefresh: () => void;
  onUpdateStatus: (transactionId: number, newStatus: string, notes?: string) => Promise<void>;
}

const TransactionsView = ({ transactions, loading, userRole, currentUserId, currentUserRegion, onCreateTransaction, onUpdateStatus }: Props) => {
  const [filterType, setFilterType] = useState<string>('all');
  
  const filtered = transactions.filter(t => filterType === 'all' || t.transaction_type === filterType);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Memuat transaksi...</div>;
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-50">Transaksi Aset</h2>
        <Button variant="primary" size="sm" onClick={onCreateTransaction} className="shadow-lg shadow-blue-500/20">
          <i className="fas fa-plus mr-1"></i> Ajukan Transaksi
        </Button>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'Mutation', 'Borrowing', 'Repair'].map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
              filterType === type 
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            {type === 'all' ? 'Semua' : type}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="space-y-3 mt-4">
        {filtered.length === 0 ? (
          <div className="glass p-8 text-center rounded-2xl">
            <i className="fas fa-inbox text-4xl text-slate-600 mb-3 block"></i>
            <p className="text-slate-400">Belum ada riwayat transaksi</p>
          </div>
        ) : (
          filtered.map(trx => {
            const statusConfig = transactionStatusConfig[trx.status] || transactionStatusConfig.Requested;
            
            return (
              <div key={trx.id} className="p-4 glass rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {trx.transaction_code}
                      </span>
                      <span className="text-xs font-medium text-slate-300">
                        {trx.transaction_type}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-100">
                      {trx.asset_serial_number !== '-' ? trx.asset_serial_number : (trx.asset_category_name || 'Permintaan Baru')}
                    </h3>
                  </div>
                  <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusConfig.bg} ${statusConfig.text}`}>
                    <i className={`fas ${statusConfig.icon} mr-1`}></i> {statusConfig.label}
                  </div>
                </div>

                <div className="text-sm text-slate-400 space-y-1 mb-4">
                  {trx.from_site_name && <p><i className="fas fa-arrow-right w-4 text-center mr-1"></i> Dari: {trx.from_site_name}</p>}
                  {trx.to_site_name && <p><i className="fas fa-map-marker-alt w-4 text-center mr-1"></i> Tujuan: {trx.to_site_name}</p>}
                  <p><i className="fas fa-user w-4 text-center mr-1"></i> Oleh: {trx.requested_by_name}</p>
                </div>

                {/* Actions based on Status & Role */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700/50">
                  {trx.status === 'Requested' && userRole === 'admin' && (!currentUserRegion || currentUserRegion === 'ALL' || currentUserRegion === trx.to_site_region) && (
                    <>
                      <Button variant="primary" size="sm" onClick={() => onUpdateStatus(trx.id, 'Approved')}>Setujui</Button>
                      <Button variant="danger" size="sm" onClick={() => onUpdateStatus(trx.id, 'Rejected')}>Tolak</Button>
                    </>
                  )}
                  {trx.status === 'Approved' && userRole === 'admin' && (
                    <Button variant="primary" size="sm" onClick={() => onUpdateStatus(trx.id, 'In Transit')}>Kirim Unit (In Transit)</Button>
                  )}
                  {trx.status === 'In Transit' && trx.transaction_type === 'Mutation' && (
                    <Button variant="primary" size="sm" onClick={() => onUpdateStatus(trx.id, 'Completed')}>Terima Unit (Completed)</Button>
                  )}
                  {trx.status === 'In Transit' && trx.transaction_type !== 'Mutation' && (
                    <Button variant="primary" size="sm" onClick={() => onUpdateStatus(trx.id, 'In Progress')}>Terima Unit (In Progress)</Button>
                  )}
                  {trx.status === 'In Progress' && (trx.transaction_type === 'Borrowing' || trx.transaction_type === 'Repair') && trx.requested_by === currentUserId && (
                    <Button variant="primary" size="sm" onClick={() => onUpdateStatus(trx.id, 'Returning')}>Kembalikan Unit (Return)</Button>
                  )}
                  {trx.status === 'Returning' && userRole === 'admin' && (
                    <Button variant="primary" size="sm" onClick={() => onUpdateStatus(trx.id, 'Completed')}>Terima di Gudang (Completed)</Button>
                  )}
                  {trx.status === 'Requested' && trx.requested_by === currentUserId && (
                    <Button variant="danger" size="sm" onClick={() => onUpdateStatus(trx.id, 'Cancelled')}>Batalkan</Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TransactionsView;

import { useState } from 'react';
import type { TransactionDetail, Site, Category } from '../types/inventory';
import { transactionStatusConfig } from '../types/inventory';
import { Button, SiteSearchInput } from '../components/ui';
import BASTDocumentModal from '../components/modals/BASTDocumentModal';

interface Props {
  transactions: TransactionDetail[];
  sites: Site[];
  categories: Category[];
  loading: boolean;
  userRole?: string;
  currentUserId: number;
  currentUserRegion?: string | null;
  onCreateTransaction: () => void;
  onRefresh: () => void;
  onUpdateStatus: (transactionId: number, newStatus: string, notes?: string) => Promise<void>;
  pendingTransactionIds: Set<number>;
}

const TransactionsView = ({ transactions, sites, loading, userRole, currentUserId, currentUserRegion, onCreateTransaction, onUpdateStatus, pendingTransactionIds }: Props) => {
  const [filterType, setFilterType] = useState<string>('all');

  // ── Guest Gate Screen state ──────────────────────────────────────────────
  const [guestSiteInput, setGuestSiteInput] = useState<string>('');
  const [guestSite, setGuestSite]           = useState<Site | null>(null);

  // ── BAST Print State ─────────────────────────────────────────────────────
  const [bastModalOpen, setBastModalOpen]   = useState(false);
  const [selectedBastTrx, setSelectedBastTrx] = useState<TransactionDetail | null>(null);

  const handleGuestSiteChange = (val: string, matched: Site | null) => {
    setGuestSiteInput(val);
    setGuestSite(matched);
  };

  // ── Filter transaksi ─────────────────────────────────────────────────────
  const filtered = transactions.filter((t) => {
    const matchType = filterType === 'all' || t.transaction_type === filterType;
    // Untuk guest: tampilkan hanya transaksi yang terkait dengan site terpilih
    if (userRole === 'guest' && guestSite) {
      const matchSite =
        t.from_site_code === guestSite.site_code ||
        t.to_site_code   === guestSite.site_code;
      return matchType && matchSite;
    }
    return matchType;
  });

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Memuat transaksi...</div>;
  }

  // ── GUEST: Gate Screen ───────────────────────────────────────────────────
  if (userRole === 'guest' && !guestSite) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 fade-in">
        <div className="w-full max-w-sm glass rounded-2xl p-6 space-y-5 border border-slate-700/60 shadow-xl">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-building text-2xl text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-50">Pilih Cabang Anda</h2>
            <p className="text-sm text-slate-400 mt-1">
              Ketik alias atau kode site cabang Anda untuk melihat transaksi yang relevan.
            </p>
          </div>

          <SiteSearchInput
            label="Lokasi Cabang (Site Alias)"
            placeholder="Ketik kode atau alias site..."
            sites={sites}
            value={guestSiteInput}
            onChange={handleGuestSiteChange}
            icon="fa-map-marker-alt"
          />

          {guestSiteInput && !guestSite && (
            <p className="text-xs text-amber-400 flex items-center gap-1.5">
              <i className="fas fa-exclamation-triangle" />
              Site belum terdaftar. Pastikan kode/alias benar.
            </p>
          )}

          <Button
            variant="primary"
            fullWidth
            disabled={!guestSite}
            onClick={() => {/* site already set, re-render triggers */}}
          >
            <i className="fas fa-arrow-right mr-2" />
            Lihat Transaksi Site Ini
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-50">Transaksi Aset</h2>
          {/* Guest: tampilkan info site yang dipilih + tombol ganti */}
          {userRole === 'guest' && guestSite && (
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
              <i className="fas fa-building text-blue-400" />
              {guestSite.site_alias} — {guestSite.site_code}
              <button
                onClick={() => { setGuestSite(null); setGuestSiteInput(''); }}
                className="text-[10px] text-blue-400 hover:text-blue-300 underline ml-1"
              >
                Ganti Site
              </button>
            </p>
          )}
        </div>
        <Button variant="primary" size="sm" onClick={onCreateTransaction} className="shadow-lg shadow-blue-500/20">
          <i className="fas fa-plus mr-1" /> Ajukan Transaksi
        </Button>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'Mutation', 'Borrowing', 'Repair'].map((type) => (
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
            <i className="fas fa-inbox text-4xl text-slate-600 mb-3 block" />
            <p className="text-slate-400">Belum ada riwayat transaksi</p>
          </div>
        ) : (
          filtered.map((trx) => {
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
                    <i className={`fas ${statusConfig.icon} mr-1`} /> {statusConfig.label}
                  </div>
                </div>

                <div className="text-sm text-slate-400 space-y-1 mb-4">
                  {trx.from_site_name && (
                    <p>
                      <i className="fas fa-arrow-right w-4 text-center mr-1" />
                      Dari: <span className="text-slate-300">{trx.from_site_name}</span>
                    </p>
                  )}
                  {trx.to_site_name && (
                    <p>
                      <i className="fas fa-map-marker-alt w-4 text-center mr-1" />
                      Tujuan: <span className="text-blue-300 font-medium">
                        {trx.to_site_name}{trx.to_site_region ? ` (Region: ${trx.to_site_region})` : ''}
                      </span>
                    </p>
                  )}
                  <p><i className="fas fa-user w-4 text-center mr-1" /> Oleh: {trx.requested_by_name}</p>
                </div>

                {/* Actions based on Status & Role */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700/50">
                  {(() => {
                    const isPending = pendingTransactionIds.has(trx.id);
                    const pendingClass = isPending ? 'opacity-50 pointer-events-none' : '';
                    return (
                      <>
                        {trx.status === 'Requested' && userRole === 'admin' && (!currentUserRegion || currentUserRegion === 'ALL' || currentUserRegion === trx.to_site_region) && (
                          <>
                            <Button variant="primary" size="sm" disabled={isPending} className={pendingClass} onClick={() => onUpdateStatus(trx.id, 'Approved')}>
                              {isPending ? <><i className="fas fa-spinner fa-spin mr-1" /> Memproses...</> : 'Setujui'}
                            </Button>
                            <Button variant="danger" size="sm" disabled={isPending} className={pendingClass} onClick={() => onUpdateStatus(trx.id, 'Rejected')}>
                              Tolak
                            </Button>
                          </>
                        )}
                        {trx.status === 'Approved' && userRole === 'admin' && (
                          <Button variant="primary" size="sm" disabled={isPending} className={pendingClass} onClick={() => onUpdateStatus(trx.id, 'In Transit')}>
                            {isPending ? <><i className="fas fa-spinner fa-spin mr-1" /> Memproses...</> : 'Kirim Unit (In Transit)'}
                          </Button>
                        )}
                        {trx.status === 'In Transit' && trx.transaction_type === 'Mutation' && (
                          <Button variant="primary" size="sm" disabled={isPending} className={pendingClass} onClick={() => onUpdateStatus(trx.id, 'Completed')}>
                            {isPending ? <><i className="fas fa-spinner fa-spin mr-1" /> Memproses...</> : 'Terima Unit (Completed)'}
                          </Button>
                        )}
                        {trx.status === 'In Transit' && trx.transaction_type !== 'Mutation' && (
                          <Button variant="primary" size="sm" disabled={isPending} className={pendingClass} onClick={() => onUpdateStatus(trx.id, 'In Progress')}>
                            {isPending ? <><i className="fas fa-spinner fa-spin mr-1" /> Memproses...</> : 'Terima Unit (In Progress)'}
                          </Button>
                        )}
                        {trx.status === 'In Progress' && (trx.transaction_type === 'Borrowing' || trx.transaction_type === 'Repair') && (trx.requested_by === currentUserId || userRole === 'admin') && (
                          <Button variant="primary" size="sm" disabled={isPending} className={pendingClass} onClick={() => onUpdateStatus(trx.id, 'Returning')}>
                            {isPending ? <><i className="fas fa-spinner fa-spin mr-1" /> Memproses...</> : (trx.requested_by === currentUserId ? 'Kembalikan Unit (Return)' : 'Tarik Unit (Admin)')}
                          </Button>
                        )}
                        {trx.status === 'Returning' && userRole === 'admin' && (
                          <Button variant="primary" size="sm" disabled={isPending} className={pendingClass} onClick={() => onUpdateStatus(trx.id, 'Completed')}>
                            {isPending ? <><i className="fas fa-spinner fa-spin mr-1" /> Memproses...</> : 'Terima di Gudang (Completed)'}
                          </Button>
                        )}
                        {trx.status === 'Requested' && trx.requested_by === currentUserId && (
                          <Button variant="danger" size="sm" disabled={isPending} className={pendingClass} onClick={() => onUpdateStatus(trx.id, 'Cancelled')}>
                            Batalkan
                          </Button>
                        )}
                        {['In Transit', 'In Progress', 'Returning', 'Completed'].includes(trx.status) && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="ml-auto flex items-center gap-1 bg-slate-700/50 hover:bg-slate-600 text-slate-300"
                            onClick={() => {
                              setSelectedBastTrx(trx);
                              setBastModalOpen(true);
                            }}
                          >
                            <i className="fas fa-print" /> Cetak BAST
                          </Button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            );
          })
        )}
      </div>

      <BASTDocumentModal
        isOpen={bastModalOpen}
        onClose={() => setBastModalOpen(false)}
        loan={selectedBastTrx as any}
        mode={selectedBastTrx?.status === 'Returning' ? 'pengembalian' : 'peminjaman'}
      />
    </div>
  );
};

export default TransactionsView;
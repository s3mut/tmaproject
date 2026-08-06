import React, { useState, useMemo } from 'react';
import type { AssetLoan, AssetDetail, Site, Category } from '../types/inventory';
import { loanStatusConfig } from '../types/inventory';
import { Button, Input, EmptyState, SiteSearchInput } from '../components/ui';
import RequestLoanModal from '../components/modals/RequestLoanModal';
import DispatchLoanModal from '../components/modals/DispatchLoanModal';
import ReturnCheckModal from '../components/modals/ReturnCheckModal';
import BASTDocumentModal from '../components/modals/BASTDocumentModal';
import CancelRejectModal, { type ActionType } from '../components/modals/CancelRejectModal';

interface Props {
  loans: AssetLoan[];
  assets: AssetDetail[];
  sites: Site[];
  categories: Category[];
  loading: boolean;
  userRole?: string;
  assignedRegion?: string | null;
  currentUserId?: number;
  currentUserName?: string;
  onRefresh: () => void;
  onRequestLoan: (params: any) => Promise<void>;
  onDispatchLoan: (params: any) => Promise<void>;
  onReceiveLoan: (params: { loanId: number; assetId: number; siteAlias: string; receivedByName: string }) => Promise<void>;
  onInitiateReturn: (loanId: number, assetId: number) => Promise<void>;
  onCloseTicket: (params: any) => Promise<void>;
  onApproveLoan?: (loanId: number) => Promise<void>;
  onCancelLoan?: (loanId: number, reason?: string) => Promise<void>;
  onRejectLoan?: (loanId: number, reason?: string) => Promise<void>;
  onForceCancelLoan?: (loanId: number, reason: string, currentAssetId?: number | null) => Promise<void>;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

const LoansView: React.FC<Props> = ({
  loans,
  assets,
  sites,
  categories,
  loading,
  userRole = 'guest',
  assignedRegion = null,
  currentUserId,
  currentUserName = 'User',
  onRefresh,
  onRequestLoan,
  onDispatchLoan,
  onReceiveLoan,
  onInitiateReturn,
  onCloseTicket,
  onApproveLoan,
  onCancelLoan,
  onRejectLoan,
  onForceCancelLoan,
  onShowToast,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Branch Context for Guest
  const [guestActiveSite, setGuestActiveSite] = useState<string | null>(() => localStorage.getItem('tma_guest_site'));
  const [tempSiteInput, setTempSiteInput] = useState('');
  const [tempMatchedSite, setTempMatchedSite] = useState<Site | null>(null);

  // Modals state
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [dispatchLoan, setDispatchLoan] = useState<AssetLoan | null>(null);
  const [returnLoan, setReturnLoan] = useState<AssetLoan | null>(null);
  const [bastLoan, setBastLoan] = useState<{ loan: AssetLoan; mode: 'peminjaman' | 'pengembalian' } | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Unified Cancel/Reject/ForceCancel Modal state
  const [crModalOpen, setCrModalOpen] = useState(false);
  const [crAction, setCrAction] = useState<ActionType>('cancel');
  const [crTargetLoan, setCrTargetLoan] = useState<AssetLoan | null>(null);

  const openCancelRejectModal = (loan: AssetLoan, action: ActionType) => {
    setCrTargetLoan(loan);
    setCrAction(action);
    setCrModalOpen(true);
  };

  const isItOfficer = userRole === 'admin' || userRole === 'user';

  // Kalkulasi Overdue untuk filter & highlight (Fase 4 Monitoring)
  const isOverdue = (loan: AssetLoan) => {
    if (loan.status !== 'Borrowed') return false;
    const now = Date.now();
    const due = new Date(loan.due_date).getTime();
    return now > due;
  };

  const getDaysDiff = (targetDateStr: string) => {
    const now = new Date();
    now.setHours(0,0,0,0);
    const target = new Date(targetDateStr);
    target.setHours(0,0,0,0);
    const diffTime = target.getTime() - now.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredLoans = useMemo(() => {
    let list = loans;

    // 1. GUEST BRANCH FILTER: Restrict to selected branch
    if (userRole === 'guest' && guestActiveSite) {
      list = list.filter(l => (l.site_alias || '').toLowerCase() === guestActiveSite.toLowerCase());
    }

    if (activeFilter === 'Overdue') {
      list = list.filter(l => isOverdue(l));
    } else if (activeFilter !== 'All') {
      list = list.filter(l => l.status === activeFilter);
    }

    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase().trim();
      list = list.filter(l =>
        l.loan_code.toLowerCase().includes(term) ||
        l.site_alias.toLowerCase().includes(term) ||
        l.category_name.toLowerCase().includes(term) ||
        (l.asset_serial_number && l.asset_serial_number.toLowerCase().includes(term)) ||
        l.purpose.toLowerCase().includes(term)
      );
    }

    return list;
  }, [loans, activeFilter, searchQuery]);

  const handleReceive = async (loan: AssetLoan) => {
    try {
      setActionLoading(loan.id);
      await onReceiveLoan({
        loanId: loan.id,
        assetId: loan.asset_id || 0,
        siteAlias: loan.site_alias,
        receivedByName: currentUserName,
      });
      if (onShowToast) onShowToast('✅ Unit berhasil dicentang Diterima di Toko!', 'success');
      onRefresh();
    } catch (e: any) {
      if (onShowToast) onShowToast(`❌ Gagal konfirmasi penerimaan: ${e.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReturnInitiate = async (loan: AssetLoan) => {
    try {
      setActionLoading(loan.id);
      await onInitiateReturn(loan.id, loan.asset_id || 0);
      if (onShowToast) onShowToast('🚚 Status barang berubah: Dikembalikan ke IT Support', 'success');
      onRefresh();
    } catch (e: any) {
      if (onShowToast) onShowToast(`❌ Gagal inisiasi return: ${e.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const tabs = [
    { key: 'All', label: 'Semua', icon: 'fa-layer-group' },
    { key: 'Requested', label: 'Request Baru', icon: 'fa-clock' },
    { key: 'Waiting Admin Approval', label: 'Eskalasi Cross-Region', icon: 'fa-user-shield' },
    { key: 'Approved', label: 'Siap Alokasi', icon: 'fa-check-circle' },
    { key: 'In-Transit', label: 'Pengiriman', icon: 'fa-truck' },
    { key: 'Borrowed', label: 'Dipinjam', icon: 'fa-box-open' },
    { key: 'Overdue', label: 'Overdue 🔴', icon: 'fa-exclamation-circle' },
    { key: 'Return In-Transit', label: 'Proses Kembali', icon: 'fa-reply' },
    { key: 'Closed', label: 'Selesai', icon: 'fa-check-double' },
  ];

  if (userRole === 'guest' && !guestActiveSite) {
    return (
      <div className="fade-in space-y-4 pb-12">
        <div className="glass rounded-2xl p-6 text-center border border-blue-500/30">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 text-blue-400 mx-auto flex items-center justify-center mb-4 text-3xl shadow-inner">
            <i className="fas fa-store" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Pilih Cabang Anda</h2>
          <p className="text-slate-400 text-xs mb-6 max-w-sm mx-auto leading-relaxed">
            Untuk menjaga privasi data, Anda hanya dapat melihat aktivitas peminjaman dari cabang Anda sendiri. Silakan pilih kode atau alias cabang Anda.
          </p>
          <div className="max-w-md mx-auto space-y-5 text-left">
            <SiteSearchInput
              sites={sites}
              value={tempSiteInput}
              onChange={(val, match) => { setTempSiteInput(val); setTempMatchedSite(match); }}
              placeholder="Cari kode cabang (misal: CGK-01)..."
            />
            <Button 
              variant="primary" 
              className="w-full font-bold shadow-blue-500/25 shadow-lg"
              disabled={!tempMatchedSite}
              onClick={() => {
                if (tempMatchedSite) {
                  const alias = tempMatchedSite.site_alias || tempMatchedSite.site_code;
                  localStorage.setItem('tma_guest_site', alias);
                  setGuestActiveSite(alias);
                }
              }}
            >
              Lanjutkan ke Data Peminjaman
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-4 pb-12">
      {/* Header & Tombol Ajukan */}
      <div className="glass rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <i className="fas fa-hand-holding-box text-blue-400 text-lg" />
            Peminjaman Aset & Unit Backup Toko
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 mb-2">
            Sirkulasi peminjaman perangkat IT sementara (Maks 14 hari) lengkap dengan BAST & scanner.
          </p>
          {userRole === 'guest' && guestActiveSite && (
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] px-2.5 py-1 rounded-full font-bold mt-1">
              <i className="fas fa-map-marker-alt" />
              Cabang: {guestActiveSite.toUpperCase()}
              <button 
                onClick={() => {
                  localStorage.removeItem('tma_guest_site');
                  setGuestActiveSite(null);
                  setTempSiteInput('');
                  setTempMatchedSite(null);
                }}
                className="ml-1 text-blue-400 hover:text-white underline decoration-blue-500/50 underline-offset-2"
              >
                [Ubah]
              </button>
            </div>
          )}
        </div>
        <Button
          variant="primary"
          size="md"
          icon="fa-plus"
          onClick={() => setRequestModalOpen(true)}
          className="shrink-0 font-bold"
        >
          Ajukan Pinjam Unit
        </Button>
      </div>

      {/* Banner RBAC Wilayah Wewenang */}
      {isItOfficer && (
        <div className={`rounded-2xl p-3.5 border flex items-center justify-between gap-3 text-xs ${
          userRole === 'admin' 
            ? 'bg-gradient-to-r from-amber-500/15 to-indigo-500/15 border-amber-500/40 text-amber-200' 
            : 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold shrink-0 ${
              userRole === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'
            }`}>
              <i className={userRole === 'admin' ? "fas fa-crown" : "fas fa-user-shield"} />
            </div>
            <div>
              <p className="font-extrabold text-white">
                {userRole === 'admin' ? '👑 Otoritas Admin Global (God Mode Active)' : `📍 Wilayah Wewenang Anda: Region ${assignedRegion || 'Semua (Global)'}`}
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {userRole === 'admin'
                  ? 'Anda berwenang memvalidasi eskalasi Cross-Region dan melakukan Force Cancel pada seluruh tiket.'
                  : `Anda hanya dapat mengalokasikan dan menyetujui tiket peminjaman toko dalam batas wilayah Region ${assignedRegion || 'Anda'}.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3">
        <Input
          placeholder="Cari nomor LOAN, alias toko, serial number, atau kategori..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon="fa-search"
        />

        {/* Filter Scroll Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {tabs.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'glass text-slate-400 hover:text-white border border-slate-700/60'
                }`}
              >
                <i className={`fas ${tab.icon} ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loan Cards List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass rounded-2xl p-5 h-40 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : filteredLoans.length === 0 ? (
        <EmptyState
          icon="fa-inbox"
          title="Belum Ada Data Peminjaman"
          description="Tidak ditemukan riwayat peminjaman yang sesuai dengan parameter filter atau pencarian Anda."
        />
      ) : (
        <div className="space-y-3.5">
          {filteredLoans.map((loan) => {
            const badge = loanStatusConfig[loan.status] || { label: loan.status, bg: 'bg-slate-800', text: 'text-slate-300', icon: 'fa-info' };
            const overdue = isOverdue(loan);
            const daysDiff = getDaysDiff(loan.due_date);
            const isIntraRegion = !assignedRegion || (loan.site_region && assignedRegion.trim().toLowerCase() === loan.site_region.trim().toLowerCase());
            const canProcessIntraRegion = userRole === 'admin' || (userRole === 'user' && isIntraRegion);

            return (
              <div
                key={loan.id}
                className={`glass rounded-2xl p-4 transition-all card-hover border ${
                  overdue
                    ? 'border-red-500/80 bg-red-950/20 shadow-lg shadow-red-500/10'
                    : 'border-slate-700/60'
                }`}
              >
                {/* Top Card Bar */}
                <div className="flex items-start justify-between pb-3 border-b border-slate-700/50 gap-2">
                  <div>
                    <span className="font-mono font-black text-amber-300 tracking-wider text-xs block">
                      {loan.loan_code}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
                        {loan.site_alias}
                      </span>
                      <span className="text-xs font-bold text-white">{loan.category_name}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {/* Status Badge */}
                    <div className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${badge.bg} ${badge.text}`}>
                      <i className={`fas ${badge.icon} text-[11px]`} />
                      <span>{badge.label}</span>
                    </div>

                    {/* Monitoring Indicator */}
                    {loan.status === 'Borrowed' && (
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-tight animate-pulse ${
                          overdue
                            ? 'bg-red-500 text-white shadow-md shadow-red-500/30'
                            : daysDiff <= 3
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {overdue
                          ? `🔴 OVERDUE (${Math.abs(daysDiff)} Hari)`
                          : daysDiff === 0
                          ? '🟡 JATUH TEMPO HARI INI'
                          : daysDiff <= 3
                          ? `🟡 H-${daysDiff} JATUH TEMPO`
                          : `🟢 Sisa ${daysDiff} Hari`}
                      </span>
                    )}

                    {loan.requires_it_approval && (
                      <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                        <i className="fas fa-exclamation-triangle mr-1"></i> Waiting IT Approval
                      </span>
                    )}
                  </div>
                </div>

                {/* Center Content */}
                <div className="py-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">Tujuan & Alasan Peminjaman:</span>
                    <p className="text-slate-200 italic font-medium mt-0.5">"{loan.purpose}" ({loan.duration_days} Hari)</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      <i className="fas fa-user text-slate-400 mr-1" />
                      Diminta Oleh: <b>{loan.requested_by_name}</b>
                    </p>
                  </div>

                  <div className="sm:border-l sm:border-slate-700/60 sm:pl-3">
                    <span className="text-slate-400 block">Status Alokasi Unit Fisik:</span>
                    {loan.asset_serial_number ? (
                      <div className="mt-1 bg-slate-800/80 rounded-xl p-2 border border-slate-700/60">
                        <p className="font-bold text-white">{loan.asset_brand} — {loan.asset_model_type || ''}</p>
                        <p className="text-amber-300 font-mono text-xs">S/N: {loan.asset_serial_number}</p>
                        {loan.tracking_number && (
                          <p className="text-[11px] text-blue-300 mt-1">
                            <i className="fas fa-shipping-fast mr-1" /> {loan.shipping_method}: {loan.tracking_number}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 italic block mt-1">
                        ⏳ Menunggu alokasi fisik & scan dari Tim IT/Gudang...
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="pt-3 border-t border-slate-700/50 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500 font-mono">
                    <i className="fas fa-calendar-alt mr-1 text-slate-400" />
                    Due: <b>{new Date(loan.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</b>
                  </div>

                  <div className="flex items-center gap-2 ml-auto flex-wrap">
                    {/* Cetak BAST Button */}
                    {(loan.status === 'In-Transit' || loan.status === 'Borrowed' || loan.status === 'Return In-Transit' || loan.status === 'Closed') && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon="fa-print"
                        onClick={() => setBastLoan({ loan, mode: loan.status.includes('Return') || loan.status === 'Closed' ? 'pengembalian' : 'peminjaman' })}
                      >
                        Cetak BAST
                      </Button>
                    )}

                    {/* Tombol Batal untuk Creator atau Admin */}
                    {(loan.status === 'Requested' || loan.status === 'Waiting Admin Approval') && (loan.requested_by_id === currentUserId || userRole === 'admin') && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon="fa-times"
                        onClick={() => openCancelRejectModal(loan, 'cancel')}
                      >
                        Batal
                      </Button>
                    )}

                    {/* Tombol Tolak untuk Tim IT / Admin */}
                    {(loan.status === 'Requested' || loan.status === 'Waiting Admin Approval' || loan.status === 'Approved') && isItOfficer && (
                      <Button
                        size="sm"
                        variant="danger"
                        icon="fa-ban"
                        disabled={!canProcessIntraRegion && loan.status !== 'Waiting Admin Approval'}
                        onClick={() => openCancelRejectModal(loan, 'reject')}
                      >
                        {!canProcessIntraRegion ? `🔒 Wilayah ${loan.site_region || 'Lain'}` : 'Tolak'}
                      </Button>
                    )}

                    {/* Eskalasi Cross-Region: Persetujuan Admin Global */}
                    {loan.status === 'Waiting Admin Approval' && (
                      userRole === 'admin' ? (
                        <Button
                          size="sm"
                          variant="primary"
                          icon="fa-crown"
                          loading={actionLoading === loan.id}
                          onClick={async () => {
                            if (onApproveLoan) {
                              try {
                                setActionLoading(loan.id);
                                await onApproveLoan(loan.id);
                                onRefresh();
                              } finally {
                                setActionLoading(null);
                              }
                            }
                          }}
                        >
                          Setujui Eskalasi
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" disabled icon="fa-lock">
                          Menunggu Admin Global
                        </Button>
                      )
                    )}

                    {/* FASE 2: IT Alokasi & Dispatch */}
                    {(loan.status === 'Requested' || loan.status === 'Approved') && isItOfficer && (
                      canProcessIntraRegion ? (
                        <Button
                          size="sm"
                          variant="primary"
                          icon="fa-truck-loading"
                          onClick={() => setDispatchLoan(loan)}
                        >
                          Alokasi & Kirim
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" disabled icon="fa-lock">
                          Wilayah {loan.site_region || 'Lain'}
                        </Button>
                      )
                    )}

                    {/* FASE 3: Toko Terima Unit */}
                    {loan.status === 'In-Transit' && (
                      <Button
                        size="sm"
                        variant="success"
                        icon="fa-check"
                        loading={actionLoading === loan.id}
                        onClick={() => handleReceive(loan)}
                      >
                        Terima Unit di Toko
                      </Button>
                    )}

                    {/* FASE 5: Toko Inisiasi Return */}
                    {loan.status === 'Borrowed' && (
                      <Button
                        size="sm"
                        variant="warning"
                        icon="fa-undo"
                        loading={actionLoading === loan.id}
                        onClick={() => handleReturnInitiate(loan)}
                      >
                        Kembalikan Unit
                      </Button>
                    )}

                    {/* FASE 5 Selesai: IT Verifikasi Kembalian */}
                    {loan.status === 'Return In-Transit' && isItOfficer && (
                      <Button
                        size="sm"
                        variant="primary"
                        icon="fa-clipboard-check"
                        onClick={() => setReturnLoan(loan)}
                      >
                        Verifikasi & Tutup Tiket
                      </Button>
                    )}

                    {/* Admin God Mode: Force Cancel */}
                    {userRole === 'admin' && !['Closed', 'Cancelled', 'Rejected'].includes(loan.status) && (
                      <Button
                        size="sm"
                        variant="warning"
                        icon="fa-bolt"
                        onClick={() => openCancelRejectModal(loan, 'force_cancel')}
                      >
                        ⚡ Force Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Request Loan */}
      <RequestLoanModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        sites={sites}
        categories={categories}
        assets={assets}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        onSubmit={async (params) => {
          await onRequestLoan(params);
          onRefresh();
        }}
        initialSiteAlias={userRole === 'guest' && guestActiveSite ? guestActiveSite : ''}
      />

      {/* Modal 2: Dispatch Loan by IT */}
      <DispatchLoanModal
        isOpen={!!dispatchLoan}
        onClose={() => setDispatchLoan(null)}
        loan={dispatchLoan}
        assets={assets}
        sites={sites}
        onDispatch={async (params) => {
          await onDispatchLoan({ ...params, durationDays: dispatchLoan?.duration_days || 14, dispatchedByName: currentUserName });
          onRefresh();
        }}
      />

      {/* Modal 3: Return Check by IT */}
      <ReturnCheckModal
        isOpen={!!returnLoan}
        onClose={() => setReturnLoan(null)}
        loan={returnLoan}
        onCloseTicket={async (params) => {
          await onCloseTicket({ ...params, itName: currentUserName });
          onRefresh();
        }}
      />

      {/* Modal 4: BAST Print Document */}
      <BASTDocumentModal
        isOpen={!!bastLoan}
        onClose={() => setBastLoan(null)}
        loan={bastLoan?.loan || null}
        mode={bastLoan?.mode || 'peminjaman'}
      />

      {/* Modal 5: Unified Cancel, Reject, and Force Cancel with Structured Reasons */}
      <CancelRejectModal
        isOpen={crModalOpen}
        onClose={() => setCrModalOpen(false)}
        actionType={crAction}
        loanCode={crTargetLoan?.loan_code}
        onConfirm={async (reason) => {
          if (!crTargetLoan) return;
          if (crAction === 'cancel' && onCancelLoan) {
            await onCancelLoan(crTargetLoan.id, reason);
          } else if (crAction === 'reject' && onRejectLoan) {
            await onRejectLoan(crTargetLoan.id, reason);
          } else if (crAction === 'force_cancel' && onForceCancelLoan) {
            await onForceCancelLoan(crTargetLoan.id, reason, crTargetLoan.asset_id);
          }
          onRefresh();
        }}
      />
    </div>
  );
};

export default LoansView;

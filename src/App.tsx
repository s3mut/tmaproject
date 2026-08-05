import { useState, useCallback, useEffect } from 'react';
import { useInventory } from './hooks/useInventory';
import type { AssetDetail } from './types/inventory';
import { useAuth } from './contexts/AuthContext';

import Header from './components/Header';
import BottomNav from './components/BottomNav';
import type { TabName } from './components/BottomNav';
import Toast from './components/Toast';
import ItemFormModal from './components/modals/ItemFormModal';
import ItemDetailModal from './components/modals/ItemDetailModal';
import QRScannerModal from './components/modals/QRScannerModal';
import MutationModal from './components/modals/MutationModal';
import CSVImportModal from './components/modals/CSVImportModal';
import ConfirmModal from './components/modals/ConfirmModal';

import DashboardView from './views/DashboardView';
import ItemsView from './views/ItemsView';
import HistoryView from './views/HistoryView';
import LoansView from './views/LoansView';
import SitesView from './views/SitesView';
import OpnameView from './views/OpnameView';
import ProfileView from './views/ProfileView';
import ReportView from './views/ReportView';
import LoginView from './views/LoginView';

declare global { interface Window { Telegram?: any; } }

function App() {
  const { currentUser, authMethod, isLoading: authLoading } = useAuth();
  const { 
    assets, mutations, sites, categories, loans,
    loading, error, addAsset, editAsset, removeAsset, mutateAsset, approveAssetMutation,
    requestAssetLoan, dispatchAssetLoan, receiveAssetLoan, initiateAssetLoanReturn, closeAssetLoanTicket,
    refresh
  } = useInventory();

  const [activeTab, setActiveTab]           = useState<TabName>('dashboard');
  const [searchValue, setSearchValue]       = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus]     = useState<string>('all');

  // Modals state
  const [formOpen, setFormOpen]             = useState(false);
  const [detailOpen, setDetailOpen]         = useState(false);
  const [qrOpen, setQrOpen]                 = useState(false);
  const [mutationOpen, setMutationOpen]     = useState(false);
  const [csvImportOpen, setCsvImportOpen]   = useState(false);
  const [editItem, setEditItem]             = useState<AssetDetail | null>(null);
  const [detailItem, setDetailItem]         = useState<AssetDetail | null>(null);
  const [confirmOpen, setConfirmOpen]       = useState(false);

  // Toast
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  useEffect(() => {
    try {
      if (window.Telegram?.WebApp) {
        if (typeof window.Telegram.WebApp.ready === 'function') {
          window.Telegram.WebApp.ready();
        }
        if (typeof window.Telegram.WebApp.expand === 'function') {
          window.Telegram.WebApp.expand();
        }
      }
    } catch (e) {
      console.warn('[TMA] Telegram WebApp init skipped (running in browser):', e);
    }
  }, []);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message: msg, type });
    setTimeout(() => setToast((p) => ({ ...p, visible: false })), 3000);
  }, []);

  // Show error from Supabase
  useEffect(() => {
    if (error) showToast(`Error: ${error}`, 'error');
  }, [error, showToast]);

  // Tab
  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
    setSearchValue('');
  };

  // Category click from dashboard (hanya update tab tanpa status)
  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat);
    setActiveTab('items');
  };

  // Status click from Dashboard stat card → navigasi ke Items dengan status + kategori
  const handleStatusClick = (status: string, category: string) => {
    setSelectedCategory(category);
    setSelectedStatus(status);
    setActiveTab('items');
  };

  // Item actions
  const handleItemClick = (id: number) => {
    if (currentUser?.role === 'guest') {
      showToast('Akses ditolak: Guest hanya dapat melihat statistik.', 'error');
      return;
    }
    const item = assets.find((a) => a.id === id);
    if (item) { setDetailItem(item); setDetailOpen(true); }
  };

  const handleAddClick = () => { setEditItem(null); setFormOpen(true); };

  const handleEditClick = () => {
    setDetailOpen(false);
    setEditItem(detailItem);
    setFormOpen(true);
  };

  const handleDeleteClick = () => {
    if (!detailItem) return;
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!detailItem) return;
    removeAsset(detailItem.id)
      .then(() => { setDetailOpen(false); setDetailItem(null); setConfirmOpen(false); showToast('Aset berhasil dihapus (soft delete)!'); })
      .catch((e: any) => { setConfirmOpen(false); showToast(e.message, 'error'); });
  };

  const handleFormSubmit = async (data: any) => {
    try {
      if (editItem) {
        // Jika status berubah, catat di log audit
        if (data.status && data.status !== editItem.status) {
          const { changeAssetStatus } = await import('./services/assetService');
          await changeAssetStatus(
            editItem.id,
            data.status,
            currentUser?.telegram_id ?? 0,
            data.description || 'Diubah via form Edit'
          );
        }
        await editAsset(editItem.id, data);
        showToast('Aset berhasil diupdate!');
      } else {
        await addAsset(data);
        showToast('Aset berhasil ditambahkan!');
      }
      setFormOpen(false);
      setEditItem(null);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleMutateClick = () => { setDetailOpen(false); setMutationOpen(true); };

  const handleMutationSubmit = async (toSiteCode: string, notes: string) => {
    if (!detailItem) return;
    try {
      await mutateAsset(detailItem.id, detailItem.site_alias ?? null, toSiteCode, notes);
      setMutationOpen(false);
      setDetailItem(null);
      showToast('Mutasi aset (Pending) berhasil dicatat!');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleBulkStatusChange = async (assetIds: number[], newStatus: any, notes: string) => {
    try {
      const { changeAssetStatus } = await import('./services/assetService');
      const teleId = currentUser?.telegram_id ?? 0;
      
      // Loop berurutan untuk mengubah status (bisa juga pakai Promise.all jika butuh paralel)
      for (const id of assetIds) {
        await changeAssetStatus(id, newStatus, teleId, notes || `Batch Update via Opname`);
      }
      
      // Refresh state global agar data aset terupdate
      refresh();
      showToast(`Berhasil mengubah status ${assetIds.length} aset menjadi ${newStatus}!`);
    } catch (e: any) {
      showToast(e.message, 'error');
      throw e;
    }
  };

  // QR Scan — Real scanner result handler
  const handleScanResult = (scannedText: string) => {
    const trimmed = scannedText.trim();
    const found = assets.find(
      (a) =>
        a.serial_number.toLowerCase() === trimmed.toLowerCase() ||
        (a.external_id && a.external_id.toLowerCase() === trimmed.toLowerCase())
    );
    if (found) {
      showToast(`✅ Aset ditemukan: ${found.serial_number}`);
      setTimeout(() => handleItemClick(found.id), 400);
    } else {
      showToast(`⚠️ Aset tidak ditemukan: "${trimmed}"`, 'error');
    }
  };

  const isGuest = currentUser?.role === 'guest';
  const showFab = !isGuest && (activeTab === 'dashboard' || activeTab === 'items');

  // ── Auth Loading / Splash Screen ────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #0a0e1a 100%)' }}>
        {/* Animated background orbs */}
        <div style={{ position: 'absolute', top: '10%', left: '15%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', filter: 'blur(40px)', animation: 'orbFloat 6s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', filter: 'blur(40px)', animation: 'orbFloat 8s ease-in-out infinite reverse' }} />
        <div style={{ position: 'absolute', top: '50%', right: '20%', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)', filter: 'blur(30px)', animation: 'orbFloat 7s ease-in-out infinite 2s' }} />

        {/* Dot grid pattern */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.06) 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />

        {/* Main content */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
          {/* Logo with animated rings */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Outer spinning ring */}
            <div style={{ position: 'absolute', width: 108, height: 108, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#3b82f6', borderRightColor: 'rgba(59,130,246,0.3)', animation: 'spinRing 1.4s linear infinite' }} />
            {/* Inner spinning ring (reverse) */}
            <div style={{ position: 'absolute', width: 88, height: 88, borderRadius: '50%', border: '1.5px solid transparent', borderBottomColor: '#8b5cf6', borderLeftColor: 'rgba(139,92,246,0.3)', animation: 'spinRing 1s linear infinite reverse' }} />
            {/* Logo icon */}
            <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg, #3b82f6 0%, #6d28d9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(59,130,246,0.5), 0 0 80px rgba(139,92,246,0.2)', animation: 'logoPulse 2s ease-in-out infinite' }}>
              <i className="fas fa-boxes-stacked" style={{ fontSize: 28, color: 'white' }}></i>
            </div>
          </div>

          {/* App name & tagline */}
          <div style={{ textAlign: 'center', animation: 'fadeSlideUp 0.6s ease-out 0.2s both' }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'white', letterSpacing: '-0.5px', marginBottom: 6 }}>
              Transit<span style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>TMA</span>
            </h1>
            <p style={{ fontSize: 12, color: '#64748b', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>IT Asset Management</p>
          </div>

          {/* Progress bar */}
          <div style={{ width: 160, animation: 'fadeSlideUp 0.6s ease-out 0.4s both' }}>
            <div style={{ height: 3, background: 'rgba(30,41,59,0.8)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: 99, animation: 'progressBar 1.8s ease-in-out infinite' }} />
            </div>
            <p style={{ marginTop: 10, fontSize: 11, color: '#475569', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <i className="fas fa-circle-notch fa-spin" style={{ color: '#3b82f6', fontSize: 10 }}></i>
              Memeriksa sesi...
            </p>
          </div>
        </div>

        {/* Version tag */}
        <div style={{ position: 'absolute', bottom: 32, animation: 'fadeSlideUp 0.6s ease-out 0.6s both' }}>
          <span style={{ fontSize: 10, color: '#1e293b', background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(148,163,184,0.1)', padding: '4px 12px', borderRadius: 99 }}>v1.0 • E1 TMA</span>
        </div>

        {/* Keyframe styles injected */}
        <style>{`
          @keyframes spinRing { to { transform: rotate(360deg); } }
          @keyframes logoPulse { 0%,100% { box-shadow: 0 0 40px rgba(59,130,246,0.5), 0 0 80px rgba(139,92,246,0.2); } 50% { box-shadow: 0 0 60px rgba(59,130,246,0.7), 0 0 100px rgba(139,92,246,0.35); } }
          @keyframes orbFloat { 0%,100% { transform: translateY(0px) scale(1); } 50% { transform: translateY(-20px) scale(1.05); } }
          @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes progressBar { 0% { width: 0%; margin-left: 0; } 50% { width: 70%; margin-left: 0; } 75% { width: 30%; margin-left: 70%; } 100% { width: 0%; margin-left: 100%; } }
        `}</style>
      </div>
    );
  }

  // ── Web Login Gate (non-Telegram, belum auth) ───────────────────────────────
  if (!currentUser && authMethod === null) {
    return <LoginView />;
  }

  // ── Main App ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-20">
      <Toast message={toast.message} visible={toast.visible} type={toast.type} />

      <Header
        activeTab={activeTab}
        searchValue={searchValue}
        userRole={currentUser?.role}
        onSearchChange={setSearchValue}
        onScanClick={() => setQrOpen(true)}
        onImportCSVClick={() => setCsvImportOpen(true)}
      />

      <main className="px-4 pt-4">
        {activeTab === 'dashboard' && (
          <DashboardView
            assets={assets}
            mutations={mutations}
            categories={categories}
            loading={loading}
            onItemClick={handleItemClick}
            onCategoryClick={handleCategoryClick}
            onViewAll={() => setActiveTab('history')}
            onStatusClick={handleStatusClick}
          />
        )}
        {activeTab === 'items' && (
          <ItemsView
            assets={assets}
            sites={sites}
            searchValue={searchValue}
            loading={loading}
            initialCategory={selectedCategory}
            initialStatus={selectedStatus}
            onItemClick={handleItemClick}
          />
        )}
        {activeTab === 'history' && (
          <HistoryView
            mutations={mutations}
            assets={assets}
            sites={sites}
            loading={loading}
            onMutate={async (assetId, fromSiteAlias, toSiteAlias, notes) => {
              await mutateAsset(assetId, fromSiteAlias, toSiteAlias, notes);
              showToast('Mutasi aset berhasil dicatat!');
            }}
            onApproveMutation={async (mutationId, assetId, toSiteCode) => {
              try {
                await approveAssetMutation(mutationId, assetId, toSiteCode);
                showToast('Aset berhasil diterima!');
              } catch (e: any) {
                showToast(e.message, 'error');
              }
            }}
          />
        )}
        {activeTab === 'loans' && (
          <LoansView
            loans={loans}
            assets={assets}
            sites={sites}
            categories={categories}
            loading={loading}
            userRole={currentUser?.role}
            currentUserId={currentUser?.telegram_id || 0}
            currentUserName={currentUser?.name || 'User'}
            onRefresh={refresh}
            onRequestLoan={async (params) => {
              await requestAssetLoan({ ...params, requestedById: currentUser?.telegram_id || 0, requestedByName: currentUser?.name || 'Toko' });
              showToast('✨ Pengajuan pinjaman berhasil dibuat!');
            }}
            onDispatchLoan={async (params) => {
              await dispatchAssetLoan(params);
              showToast('🚀 Unit berhasil dipindai & dikirim ke toko!');
            }}
            onReceiveLoan={async (params) => {
              await receiveAssetLoan(params);
            }}
            onInitiateReturn={async (loanId, assetId) => {
              await initiateAssetLoanReturn(loanId, assetId);
            }}
            onCloseTicket={async (params) => {
              await closeAssetLoanTicket(params);
              showToast('✅ Tiket pinjam ditutup. Status aset fisik telah diperbarui!');
            }}
            onShowToast={showToast}
          />
        )}
        {activeTab === 'sites' && <SitesView sites={sites} loading={loading} />}
        {activeTab === 'opname' && <OpnameView sites={sites} assets={assets} onBulkStatusChange={handleBulkStatusChange} />}
        {activeTab === 'profile' && <ProfileView assets={assets} mutations={mutations} sites={sites} categories={categories} onShowToast={showToast} onOpenReport={() => setActiveTab('report')} />}
        {activeTab === 'report' && <ReportView onBack={() => setActiveTab('profile')} onShowToast={showToast} />}
      </main>

      {showFab && (
        <button className="floating-btn" onClick={handleAddClick}>
          <i className="fas fa-plus"></i>
        </button>
      )}

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} isGuest={isGuest} />

      <ItemFormModal
        isOpen={formOpen}
        editItem={editItem}
        sites={sites}
        categories={categories}
        onClose={() => { setFormOpen(false); setEditItem(null); }}
        onSubmit={handleFormSubmit}
      />
      <ItemDetailModal
        isOpen={detailOpen}
        item={detailItem}
        onClose={() => { setDetailOpen(false); setDetailItem(null); }}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onMutate={handleMutateClick}
      />
      <MutationModal
        isOpen={mutationOpen}
        asset={detailItem}
        sites={sites}
        onClose={() => setMutationOpen(false)}
        onSubmit={handleMutationSubmit}
      />
      <QRScannerModal
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        onScanResult={handleScanResult}
      />
      <CSVImportModal
        isOpen={csvImportOpen}
        userRole={currentUser?.role ?? 'guest'}
        categories={categories}
        sites={sites}
        onClose={() => setCsvImportOpen(false)}
        onSuccess={(count) => {
          refresh();
          showToast(`Berhasil mengunggah ${count} unit aset dari CSV!`);
        }}
      />
      <ConfirmModal
        isOpen={confirmOpen}
        title="Hapus Aset?"
        message={`Aset "${detailItem?.brand ?? ''} ${detailItem?.model_type ?? detailItem?.serial_number ?? ''}" akan dihapus dari inventaris. Tindakan ini bisa dibatalkan oleh Admin melalui database.`}
        confirmLabel="Ya, Hapus Aset"
        icon="fa-trash-alt"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

export default App;

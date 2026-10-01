import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useInventory } from './hooks/useInventory';
import { useCameraPermission } from './hooks/useCameraPermission';

import { useAuth } from './contexts/AuthContext';
import { useModals } from './contexts/ModalContext';
import { changeAssetStatus } from './services/assetService';
import { triggerHaptic } from './utils/telegramHaptics';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import type { TabName } from './components/BottomNav';
import SubViewLayout from './components/layout/SubViewLayout';
import Toast from './components/Toast';
import ItemFormModal from './components/modals/ItemFormModal';
import ItemDetailModal from './components/modals/ItemDetailModal';
import QRScannerModal from './components/modals/QRScannerModal';
import TransactionModal from './components/modals/TransactionModal';
import CSVImportModal from './components/modals/CSVImportModal';
import ConfirmModal from './components/modals/ConfirmModal';
import ProposeDisposalModal from './components/modals/ProposeDisposalModal';

const DashboardView = lazy(() => import('./views/DashboardView'));
const TransactionsView = lazy(() => import('./views/TransactionsView'));
const SitesView = lazy(() => import('./views/SitesView'));
const OpnameView = lazy(() => import('./views/OpnameView'));
const ProfileView = lazy(() => import('./views/ProfileView'));
const ReportView = lazy(() => import('./views/ReportView'));
const SettingsView = lazy(() => import('./views/SettingsView'));
const LoginView = lazy(() => import('./views/LoginView'));
const DisposalQueueView = lazy(() => import('./views/DisposalQueueView'));
const MenuView = lazy(() => import('./views/MenuView'));
const ItemsView = lazy(() => import('./views/ItemsView'));

declare global { interface Window { Telegram?: any; } }

function App() {
  useCameraPermission();
  const { currentUser, authMethod, isLoading: authLoading } = useAuth();
  const { 
    assets, transactions, sites, categories, lockedAssetIds, pendingTransactionIds,
    loading, error, addAsset, editAsset, removeAsset, createNewTransaction, updateTrxStatus,
    refresh
  } = useInventory();

  const [activeTab, setActiveTab]           = useState<TabName>('home');
  const [activeSubView, setActiveSubView]   = useState<string | null>(null);
  const [searchValue, setSearchValue]       = useState('');

  const navigateTo = (subView: string) => setActiveSubView(subView);
  const goBack = () => setActiveSubView(null);

  const { state: modals, openForm, closeForm, openDetail, closeDetail, openQr, closeQr, openTransaction, closeTransaction, openCsvImport, closeCsvImport, openConfirm, closeConfirm, openProposeDisposal, closeProposeDisposal } = useModals();

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
    triggerHaptic(type);
    setToast({ visible: true, message: msg, type });
    setTimeout(() => setToast((p) => ({ ...p, visible: false })), 3000);
  }, []);

  // Show error from Supabase
  useEffect(() => {
    if (error) showToast(`Error: ${error}`, 'error');
  }, [error, showToast]);

  // Keamanan: Hanya role admin yang dapat mengakses tab 'settings'
  useEffect(() => {
    if (activeSubView === 'settings' && currentUser?.role !== 'admin') {
      setActiveSubView('profile');
    }
  }, [activeSubView, currentUser?.role]);

  // Tab
  const handleTabChange = (tab: TabName) => {
    triggerHaptic('light');
    setActiveTab(tab);
    setActiveSubView(null);
    setSearchValue('');
  };



  // Item actions
  const handleItemClick = (id: number) => {
    if (currentUser?.role === 'guest') {
      showToast('Akses ditolak: Guest hanya dapat melihat statistik.', 'error');
      return;
    }
    const item = assets.find((a) => a.id === id);
    if (item) { openDetail(item); }
  };

  const handleAddClick = () => { triggerHaptic('light'); openForm(); };

  const handleEditClick = () => {
    closeDetail();
    openForm(modals.detailItem);
  };

  const handleDeleteClick = () => {
    if (!modals.detailItem) return;
    openConfirm();
  };

  const handleDeleteConfirm = () => {
    if (!modals.detailItem) return;
    removeAsset(modals.detailItem.id)
      .then(() => { closeDetail(); closeConfirm(); showToast('Aset berhasil dihapus (soft delete)!'); })
      .catch((e: any) => { closeConfirm(); showToast(e.message, 'error'); });
  };

  const handleFormSubmit = async (data: any) => {
    try {
      if (modals.editItem) {
        // Jika status berubah, catat di log audit
        if (data.status && data.status !== modals.editItem.status) {
          
          await changeAssetStatus(
            modals.editItem.id,
            data.status,
            currentUser?.telegram_id ?? 0,
            data.description || 'Diubah via form Edit'
          );
        }
        await editAsset(modals.editItem.id, data);
        showToast('Aset berhasil diupdate!');
      } else {
        await addAsset(data);
        showToast('Aset berhasil ditambahkan!');
      }
      closeForm();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleMutateClick = () => { closeDetail(); openTransaction(modals.detailItem); };

  const handleTransactionSubmit = async (data: any) => {
    try {
      await createNewTransaction({
        ...data,
        requested_by: currentUser?.telegram_id ?? 0,
      }, currentUser?.name);
      closeTransaction();
      showToast('Permintaan transaksi berhasil dibuat!');
    } catch (e: any) {
      showToast(e.message, 'error');
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
      triggerHaptic('success');
      showToast(`✅ Aset ditemukan: ${found.serial_number}`);
      setTimeout(() => handleItemClick(found.id), 400);
    } else {
      triggerHaptic('error');
      showToast(`⚠️ Aset tidak ditemukan: "${trimmed}"`, 'error');
    }
  };

  const isGuest = currentUser?.role === 'guest';
  const showFab = !isGuest && activeTab === 'home' && !activeSubView;

  // ── Auth Loading / Splash Screen ────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-slate-900">
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
            <h1 className="text-slate-50" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>
              E1-<span style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>TMA</span>
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

      {!activeSubView && (
        <Header
          activeView={activeTab as any}
          searchValue={searchValue}
          userRole={currentUser?.role}
          onSearchChange={setSearchValue}
          onScanClick={openQr}
          onImportCSVClick={openCsvImport}
        />
      )}

      {!activeSubView ? (
        <main className="px-4 pt-4 pb-24">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <i className="fas fa-spinner fa-spin text-4xl text-blue-500 mb-4"></i>
              <p className="text-slate-400 text-sm animate-pulse">Memuat halaman...</p>
            </div>
          }>
            {activeTab === 'home' && (
              <DashboardView
                assets={assets}
                transactions={transactions}
                loading={loading}
                onItemClick={handleItemClick}
                onViewAll={() => navigateTo('transactions')}
              />
            )}
            {activeTab === 'menu' && (
              <MenuView navigateTo={navigateTo} />
            )}
            {activeTab === 'profile' && (
              <ProfileView onShowToast={showToast} />
            )}
          </Suspense>
        </main>
      ) : (
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <i className="fas fa-spinner fa-spin text-4xl text-blue-500 mb-4"></i>
            <p className="text-slate-400 text-sm animate-pulse">Memuat halaman...</p>
          </div>
        }>
          {activeSubView === 'items' && (
            <SubViewLayout title="Daftar Aset" onBack={goBack}>
              <ItemsView
                assets={assets}
                sites={sites}
                searchValue={searchValue}
                initialCategory="all"
                initialStatus="all"
                initialRegion="all"
                lockedAssetIds={lockedAssetIds}
                categories={categories}
                loading={loading}
                onItemClick={handleItemClick}
              />
            </SubViewLayout>
          )}
          {activeSubView === 'loans' && (
            <SubViewLayout title="Antrean Pinjaman" onBack={goBack}>
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
                <i className="fas fa-hand-holding-box text-5xl text-purple-400 mb-4"></i>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Segera Hadir</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto">Modul antrean pinjaman sedang dalam tahap pengembangan.</p>
              </div>
            </SubViewLayout>
          )}
          {activeSubView === 'transactions' && (
            <SubViewLayout title="Mutasi Aset" onBack={goBack}>
              <TransactionsView
                transactions={transactions}
                sites={sites}
                categories={categories}
                loading={loading}
                userRole={currentUser?.role}
                currentUserId={currentUser?.telegram_id || 0}
                currentUserRegion={currentUser?.assigned_region}
                pendingTransactionIds={pendingTransactionIds}
                onCreateTransaction={() => { openTransaction(); }}
                onRefresh={refresh}
                onUpdateStatus={async (id, status) => {
                  try {
                    await updateTrxStatus(id, status, currentUser?.telegram_id || 0);
                    showToast(`Status transaksi berhasil diperbarui menjadi ${status}`);
                  } catch (e: any) {
                    showToast(e.message, 'error');
                  }
                }}
              />
            </SubViewLayout>
          )}
          {activeSubView === 'sites' && (
            <SubViewLayout title="Daftar Site" onBack={goBack}>
              <SitesView sites={sites} loading={loading} />
            </SubViewLayout>
          )}
          {activeSubView === 'opname' && (
            <SubViewLayout title="Stock Opname" onBack={goBack}>
              <OpnameView
                sites={sites}
                assets={assets}
                lockedAssetIds={lockedAssetIds}
                currentUserId={currentUser?.telegram_id || 0}
                userRole={currentUser?.role}
                onShowToast={showToast}
                onRefreshAssets={refresh}
              />
            </SubViewLayout>
          )}
          {activeSubView === 'disposal' && (
            <SubViewLayout title="Antrean Afkir" onBack={goBack}>
              <DisposalQueueView
                currentUserId={currentUser?.telegram_id || 0}
                currentUserName={currentUser?.name ?? 'Admin'}
                currentUserRole={currentUser?.role}
                onShowToast={showToast}
                onRefreshAssets={refresh}
              />
            </SubViewLayout>
          )}
          {activeSubView === 'report' && (
            <SubViewLayout title="Laporan & Analitik" onBack={goBack}>
              <ReportView
                onBack={goBack}
                onShowToast={showToast}
                sites={sites}
                categories={categories}
                transactions={transactions}
              />
            </SubViewLayout>
          )}
          {activeSubView === 'settings' && (
            <SubViewLayout title="Super Admin Settings" onBack={goBack}>
              <SettingsView
                onBack={goBack}
                onShowToast={showToast}
                sites={sites}
                categories={categories}
                currentUser={currentUser}
                onRefresh={refresh}
              />
            </SubViewLayout>
          )}
        </Suspense>
      )}

      {showFab && (
        <button className="floating-btn" onClick={handleAddClick}>
          <i className="fas fa-plus"></i>
        </button>
      )}

      {!activeSubView && (
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      )}

      <ItemFormModal
        isOpen={modals.formOpen}
        editItem={modals.editItem}
        sites={sites}
        categories={categories}
        onClose={closeForm}
        onSubmit={handleFormSubmit}
      />
      <ItemDetailModal
        isOpen={modals.detailOpen}
        item={modals.detailItem}
        onClose={closeDetail}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onMutate={handleMutateClick}
        currentUserRole={currentUser?.role}
        onProposeDisposal={() => {
          closeDetail();
          openProposeDisposal();
        }}
      />
      <TransactionModal
        isOpen={modals.transactionOpen}
        asset={modals.detailItem}
        sites={sites}
        categories={categories}
        onClose={closeTransaction}
        onSubmit={handleTransactionSubmit}
      />
      <QRScannerModal
        isOpen={modals.qrOpen}
        onClose={closeQr}
        onScanResult={handleScanResult}
      />
      <CSVImportModal
        isOpen={modals.csvImportOpen}
        userRole={currentUser?.role ?? 'guest'}
        categories={categories}
        sites={sites}
        onClose={closeCsvImport}
        onSuccess={(count) => {
          refresh();
          showToast(`Berhasil mengunggah ${count} unit aset dari CSV!`);
        }}
      />
      <ConfirmModal
        isOpen={modals.confirmOpen}
        title="Hapus Aset?"
        message={`Aset "${modals.detailItem?.brand ?? ''} ${modals.detailItem?.model_type ?? modals.detailItem?.serial_number ?? ''}" akan dihapus dari inventaris. Tindakan ini bisa dibatalkan oleh Admin melalui database.`}
        confirmLabel="Ya, Hapus Aset"
        icon="fa-trash-alt"
        onConfirm={handleDeleteConfirm}
        onCancel={closeConfirm}
      />
      <ProposeDisposalModal
        isOpen={modals.proposeDisposalOpen}
        asset={modals.detailItem}
        currentUserId={currentUser?.telegram_id || 0}
        onClose={closeProposeDisposal}
        onSuccess={() => { refresh(); }}
        onShowToast={showToast}
      />
    </div>
  );
}

export default App;

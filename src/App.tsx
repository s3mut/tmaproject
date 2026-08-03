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
import SitesView from './views/SitesView';
import OpnameView from './views/OpnameView';
import ProfileView from './views/ProfileView';
import ReportView from './views/ReportView';
import LoginView from './views/LoginView';

declare global { interface Window { Telegram?: any; } }

function App() {
  const { currentUser, authMethod, isLoading: authLoading } = useAuth();
  const { 
    assets, mutations, sites, categories,
    loading, error, addAsset, editAsset, removeAsset, mutateAsset, approveAssetMutation, refresh
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

  // ── Auth Loading Screen ─────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/40">
          <i className="fas fa-boxes-stacked text-2xl text-white"></i>
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-semibold text-white">TransitTMA</p>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <i className="fas fa-spinner fa-spin text-blue-400"></i> Memeriksa sesi...
          </p>
        </div>
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
            categories={categories}
            loading={loading}
            onItemClick={handleItemClick}
            onCategoryClick={handleCategoryClick}
            onViewAll={() => { setSelectedCategory('all'); setSelectedStatus('all'); setActiveTab('items'); }}
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
        {activeTab === 'sites' && <SitesView sites={sites} loading={loading} />}
        {activeTab === 'opname' && <OpnameView sites={sites} assets={assets} onBulkStatusChange={handleBulkStatusChange} />}
        {activeTab === 'profile' && <ProfileView onShowToast={showToast} onOpenReport={() => setActiveTab('report')} />}
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

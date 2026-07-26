import { useState, useCallback, useEffect } from 'react';
import { useInventory } from './hooks/useInventory';
import type { AssetDetail, MasterAsset } from './types/inventory';

import Header from './components/Header';
import BottomNav from './components/BottomNav';
import type { TabName } from './components/BottomNav';
import Toast from './components/Toast';
import ItemFormModal from './components/modals/ItemFormModal';
import ItemDetailModal from './components/modals/ItemDetailModal';
import QRScannerModal from './components/modals/QRScannerModal';
import MutationModal from './components/modals/MutationModal';

import DashboardView from './views/DashboardView';
import ItemsView from './views/ItemsView';
import HistoryView from './views/HistoryView';
import ProfileView from './views/ProfileView';

declare global { interface Window { Telegram?: any; } }

function App() {
  const { assets, mutations, sites, stats, loading, error, addAsset, editAsset, removeAsset, mutateAsset } = useInventory();

  const [activeTab, setActiveTab]           = useState<TabName>('dashboard');
  const [searchValue, setSearchValue]       = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals state
  const [formOpen, setFormOpen]             = useState(false);
  const [detailOpen, setDetailOpen]         = useState(false);
  const [qrOpen, setQrOpen]                 = useState(false);
  const [mutationOpen, setMutationOpen]     = useState(false);
  const [editItem, setEditItem]             = useState<AssetDetail | null>(null);
  const [detailItem, setDetailItem]         = useState<AssetDetail | null>(null);

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

  // Category click from dashboard
  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat);
    setActiveTab('items');
  };

  // Item actions
  const handleItemClick = (id: number) => {
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
    if (window.confirm('Yakin ingin menghapus aset ini?')) {
      removeAsset(detailItem.id)
        .then(() => { setDetailOpen(false); setDetailItem(null); showToast('Aset berhasil dihapus!'); })
        .catch((e: any) => showToast(e.message, 'error'));
    }
  };

  const handleFormSubmit = async (data: Omit<MasterAsset, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (editItem) {
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
      await mutateAsset(detailItem.id, detailItem.site_code ?? null, toSiteCode, notes);
      setMutationOpen(false);
      setDetailItem(null);
      showToast('Mutasi aset berhasil dicatat!');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // QR Scan
  const handleSimulateScan = () => {
    setQrOpen(false);
    if (assets.length === 0) return;
    const r = assets[Math.floor(Math.random() * assets.length)];
    showToast(`QR terdeteksi: ${r.serial_number}`);
    setTimeout(() => handleItemClick(r.id), 500);
  };

  const showFab = activeTab === 'dashboard' || activeTab === 'items';

  return (
    <div className="min-h-screen pb-20">
      <Toast message={toast.message} visible={toast.visible} type={toast.type} />

      <Header
        activeTab={activeTab}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onScanClick={() => setQrOpen(true)}
      />

      <main className="px-4 pt-4">
        {activeTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            assets={assets}
            loading={loading}
            onItemClick={handleItemClick}
            onCategoryClick={handleCategoryClick}
          />
        )}
        {activeTab === 'items' && (
          <ItemsView
            assets={assets}
            searchValue={searchValue}
            loading={loading}
            initialCategory={selectedCategory}
            onItemClick={handleItemClick}
          />
        )}
        {activeTab === 'history' && <HistoryView mutations={mutations} loading={loading} />}
        {activeTab === 'profile' && <ProfileView />}
      </main>

      {showFab && (
        <button className="floating-btn" onClick={handleAddClick}>
          <i className="fas fa-plus"></i>
        </button>
      )}

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      <ItemFormModal
        isOpen={formOpen}
        editItem={editItem}
        sites={sites}
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
        onSimulateScan={handleSimulateScan}
      />
    </div>
  );
}

export default App;

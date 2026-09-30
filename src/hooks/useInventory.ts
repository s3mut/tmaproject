import { useState, useCallback, useEffect, useMemo } from 'react';
import type { AssetDetail, MasterAsset, Site, Category, TransactionDetail } from '../types/inventory';
import { getAssets, createAsset, updateAsset, deleteAsset, getCategories } from '../services/assetService';
import { getSites } from '../services/siteService';
import { getTransactions, createTransaction, updateTransactionStatus, getActiveTransactionAssetIds } from '../services/transactionService';

export function useInventory() {
  const [assets, setAssets] = useState<AssetDetail[]>([]);
  const [transactions, setTransactions] = useState<TransactionDetail[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [lockedAssetIds, setLockedAssetIds] = useState<Set<number>>(new Set());
  const [pendingTransactionIds, setPendingTransactionIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats computed dari assets dengan useMemo dan single iteration
  const stats = useMemo(() => {
    let active = 0, backup = 0, retired = 0, disposed = 0;
    for (const a of assets) {
      switch (a.status) {
        case 'Active': active++; break;
        case 'Backup': backup++; break;
        case 'Retired': retired++; break;
        case 'Disposed': disposed++; break;
      }
    }
    return {
      total: assets.length,
      active,
      backup,
      retired,
      disposed
    };
  }, [assets]);

  // Fetch semua data dari Supabase
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        getAssets(),
        getTransactions(),
        getSites(),
        getCategories(),
        getActiveTransactionAssetIds(),
      ]);

      if (results[0].status === 'fulfilled') setAssets(results[0].value);
      else { console.error('Error fetching assets:', results[0].reason); setError(prev => prev ? prev + ' | Error Assets' : 'Error fetch Assets'); }

      if (results[1].status === 'fulfilled') setTransactions(results[1].value);
      else { console.error('Error fetching transactions:', results[1].reason); setError(prev => prev ? prev + ' | Error Transaksi' : 'Error fetch Transaksi'); }

      if (results[2].status === 'fulfilled') setSites(results[2].value);
      else { console.error('Error fetching sites:', results[2].reason); setError(prev => prev ? prev + ' | Error Sites' : 'Error fetch Sites'); }

      if (results[3].status === 'fulfilled') setCategories(results[3].value);
      else { console.error('Error fetching categories:', results[3].reason); setError(prev => prev ? prev + ' | Error Kategori' : 'Error fetch Kategori'); }

      if (results[4].status === 'fulfilled') setLockedAssetIds(new Set(results[4].value));
      else { console.error('Error fetching locked assets:', results[4].reason); setError(prev => prev ? prev + ' | Error Locked Assets' : 'Error fetch Locked Assets'); }

    } catch (err: any) {
      setError(err.message ?? 'Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Helpers efisiensi untuk refresh parsial tanpa menarik ulang tabel referensi statis (sites & categories)
  const fetchOnlyAssets = useCallback(async () => {
    try {
      const data = await getAssets();
      setAssets(data);
    } catch (err: any) {
      console.error('Error refreshing assets:', err.message);
    }
  }, []);

  // Tambah aset - hanya refresh daftar aset
  const addAsset = useCallback(async (data: Omit<MasterAsset, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>) => {
    const created = await createAsset(data);
    setAssets((prev) => [created as unknown as AssetDetail, ...prev]);
  }, []);

  // Update aset - hanya refresh daftar aset
  const editAsset = useCallback(async (id: number, data: Partial<Omit<MasterAsset, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>>) => {
    const updated = await updateAsset(id, data);
    setAssets((prev) => prev.map((a) => a.id === id ? { ...a, ...updated } as unknown as AssetDetail : a));
  }, []);

  // Hapus aset (Soft Delete) - Optimistic update ke state memory tanpa re-fetch
  const removeAsset = useCallback(async (id: number) => {
    await deleteAsset(id);
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Actions untuk Transactions Gabungan
  const createNewTransaction = useCallback(async (params: Parameters<typeof createTransaction>[0], requestedByName?: string) => {
    const created = await createTransaction(params);
    
    const matchedSite = sites.find(s => s.site_code === created.to_site_code);
    const matchedCategory = categories.find(c => c.id === created.category_id);
    const matchedAsset = created.asset_id
      ? assets.find(a => a.id === created.asset_id)
      : null;

    const enriched: TransactionDetail = {
      ...created,
      to_site_name: matchedSite?.site_name ?? created.to_site_code,
      to_site_region: matchedSite?.region ?? '',
      from_site_name: assets.find(a => a.site_alias === created.from_site_code)?.site_alias ?? created.from_site_code ?? '',
      asset_category_name: matchedCategory?.name ?? '',
      asset_serial_number: matchedAsset?.serial_number ?? '',
      asset_brand: matchedAsset?.brand ?? '',
      asset_model_type: matchedAsset?.model_type ?? '',
      requested_by_name: requestedByName ?? '',
      approved_by_name: '',
      dispatched_by_name: '',
      received_by_name: '',
    };

    setTransactions(prev => [enriched, ...prev]);

    try {
      const lockedIds = await getActiveTransactionAssetIds();
      setLockedAssetIds(new Set(lockedIds));
    } catch (err) {
      console.error('Error refreshing locked assets:', err);
    }
  }, [sites, categories, assets]);

  const updateTrxStatus = useCallback(async (transactionId: number, newStatus: string, userId: number, assetId?: number, notes?: string) => {
    if (pendingTransactionIds.has(transactionId)) return;
    setPendingTransactionIds(prev => new Set(prev).add(transactionId));
    try {
      const updated = await updateTransactionStatus(transactionId, newStatus, userId, assetId, notes);
      setTransactions(prev => prev.map(t =>
        t.id === transactionId ? { ...t, ...updated } : t
      ));

      const TERMINAL = ['Completed', 'Rejected', 'Cancelled'];
      if (TERMINAL.includes(newStatus)) {
        await fetchOnlyAssets();
      }

      const lockedIds = await getActiveTransactionAssetIds();
      setLockedAssetIds(new Set(lockedIds));
    } finally {
      setPendingTransactionIds(prev => {
        const next = new Set(prev);
        next.delete(transactionId);
        return next;
      });
    }
  }, [fetchOnlyAssets, pendingTransactionIds]);



  return {
    assets,
    transactions,
    sites,
    categories,
    stats,
    lockedAssetIds,
    pendingTransactionIds,
    loading,
    error,
    addAsset,
    editAsset,
    removeAsset,
    createNewTransaction,
    updateTrxStatus,
    refresh: fetchAll,
  };
}

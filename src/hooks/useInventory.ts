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

  const fetchAssetsAndTransactions = useCallback(async () => {
    try {
      const [assetsRes, trxRes, lockedRes] = await Promise.allSettled([
        getAssets(),
        getTransactions(),
        getActiveTransactionAssetIds(),
      ]);
      if (assetsRes.status === 'fulfilled') setAssets(assetsRes.value);
      if (trxRes.status === 'fulfilled') setTransactions(trxRes.value);
      if (lockedRes.status === 'fulfilled') setLockedAssetIds(new Set(lockedRes.value));
    } catch (err: any) {
      console.error('Error refreshing assets and transactions:', err.message);
    }
  }, []);

  // Tambah aset - hanya refresh daftar aset
  const addAsset = useCallback(async (data: Omit<MasterAsset, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>) => {
    await createAsset(data);
    await fetchOnlyAssets();
  }, [fetchOnlyAssets]);

  // Update aset - hanya refresh daftar aset
  const editAsset = useCallback(async (id: number, data: Partial<Omit<MasterAsset, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>>) => {
    await updateAsset(id, data);
    await fetchOnlyAssets();
  }, [fetchOnlyAssets]);

  // Hapus aset (Soft Delete) - Optimistic update ke state memory tanpa re-fetch
  const removeAsset = useCallback(async (id: number) => {
    await deleteAsset(id);
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Actions untuk Transactions Gabungan
  const createNewTransaction = useCallback(async (params: Parameters<typeof createTransaction>[0]) => {
    await createTransaction(params);
    await fetchAssetsAndTransactions();
  }, [fetchAssetsAndTransactions]);

  const updateTrxStatus = useCallback(async (transactionId: number, newStatus: string, userId: number, assetId?: number, notes?: string) => {
    await updateTransactionStatus(transactionId, newStatus, userId, assetId, notes);
    await fetchAssetsAndTransactions();
  }, [fetchAssetsAndTransactions]);



  return {
    assets,
    transactions,
    sites,
    categories,
    stats,
    lockedAssetIds,
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

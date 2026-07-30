import { useState, useCallback, useEffect } from 'react';
import type { AssetDetail, MasterAsset, MutationDetail, Site, Category } from '../types/inventory';
import { getAssets, createAsset, updateAsset, deleteAsset, getCategories } from '../services/assetService';
import { getMutations, createMutation, approveMutation } from '../services/mutationService';
import { getSites } from '../services/siteService';

// ─── Hardcoded Telegram User (sementara, sebelum auth diimplementasi) ───
export const HARDCODED_USER: { telegram_id: number; name: string; role: string } = {
  telegram_id: 999999999,
  name: 'Admin IT',
  role: 'admin',
};

export function useInventory() {
  const [assets, setAssets] = useState<AssetDetail[]>([]);
  const [mutations, setMutations] = useState<MutationDetail[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats computed dari assets
  const stats = {
    total: assets.length,
    active:  assets.filter((a) => a.status === 'Active').length,
    backup:  assets.filter((a) => a.status === 'Backup').length,
    broken:  assets.filter((a) => a.status === 'Broken').length,
    repair:  assets.filter((a) => a.status === 'Repair').length,
    inTransit: assets.filter((a) => a.status === 'In Transit').length,
  };

  // Fetch semua data dari Supabase
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        getAssets(),
        getMutations(),
        getSites(),
        getCategories(),
      ]);

      if (results[0].status === 'fulfilled') setAssets(results[0].value);
      else { console.error('Error fetching assets:', results[0].reason); setError(prev => prev ? prev + ' | Error Assets' : 'Error fetch Assets'); }

      if (results[1].status === 'fulfilled') setMutations(results[1].value);
      else { console.error('Error fetching mutations:', results[1].reason); setError(prev => prev ? prev + ' | Error Mutasi' : 'Error fetch Mutasi'); }

      if (results[2].status === 'fulfilled') setSites(results[2].value);
      else { console.error('Error fetching sites:', results[2].reason); setError(prev => prev ? prev + ' | Error Sites' : 'Error fetch Sites'); }

      if (results[3].status === 'fulfilled') setCategories(results[3].value);
      else { console.error('Error fetching categories:', results[3].reason); setError(prev => prev ? prev + ' | Error Kategori' : 'Error fetch Kategori'); }
    } catch (err: any) {
      setError(err.message ?? 'Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Tambah aset
  const addAsset = useCallback(async (data: Omit<MasterAsset, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>) => {
    await createAsset(data);
    await fetchAll();
  }, [fetchAll]);

  // Update aset
  const editAsset = useCallback(async (id: number, data: Partial<Omit<MasterAsset, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>>) => {
    await updateAsset(id, data);
    await fetchAll();
  }, [fetchAll]);

  // Hapus aset (Soft Delete)
  const removeAsset = useCallback(async (id: number) => {
    await deleteAsset(id);
    await fetchAll();
  }, [fetchAll]);

  // Mutasi aset (Maker - Pending Handover)
  const mutateAsset = useCallback(async (
    assetId: number,
    fromSiteCode: string | null,
    toSiteCode: string,
    notes: string
  ) => {
    await createMutation({
      asset_id: assetId,
      from_site_code: fromSiteCode,
      to_site_code: toSiteCode,
      moved_by: HARDCODED_USER.telegram_id,
      notes: notes || null,
    });
    // asset.site_alias TIDAK langsung diupdate! Statusnya saja jadi 'In Transit' di dalam createMutation
    await fetchAll();
  }, [fetchAll]);

  // Approve mutasi (Checker - Asset Received)
  const approveAssetMutation = useCallback(async (mutationId: number, assetId: number, toSiteCode: string) => {
    await approveMutation(mutationId, assetId, toSiteCode, HARDCODED_USER.telegram_id);
    await fetchAll();
  }, [fetchAll]);

  return {
    assets,
    mutations,
    sites,
    categories,
    stats,
    loading,
    error,
    addAsset,
    editAsset,
    removeAsset,
    mutateAsset,
    approveAssetMutation,
    refresh: fetchAll,
  };
}

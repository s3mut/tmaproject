import { useState, useCallback, useEffect } from 'react';
import type { AssetDetail, MasterAsset, MutationDetail, Site } from '../types/inventory';
import { getAssets, createAsset, updateAsset, deleteAsset } from '../services/assetService';
import { getMutations, createMutation } from '../services/mutationService';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats computed dari assets
  const stats = {
    total: assets.length,
    active:  assets.filter((a) => a.status === 'Active').length,
    backup:  assets.filter((a) => a.status === 'Backup').length,
    broken:  assets.filter((a) => a.status === 'Broken').length,
    repair:  assets.filter((a) => a.status === 'Repair').length,
  };

  // Fetch semua data dari Supabase
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetData, mutationData, siteData] = await Promise.all([
        getAssets(),
        getMutations(),
        getSites(),
      ]);
      setAssets(assetData);
      setMutations(mutationData);
      setSites(siteData);
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
  const addAsset = useCallback(async (data: Omit<MasterAsset, 'id' | 'created_at' | 'updated_at'>) => {
    await createAsset(data);
    await fetchAll();
  }, [fetchAll]);

  // Update aset
  const editAsset = useCallback(async (id: number, data: Partial<Omit<MasterAsset, 'id' | 'created_at' | 'updated_at'>>) => {
    await updateAsset(id, data);
    await fetchAll();
  }, [fetchAll]);

  // Hapus aset
  const removeAsset = useCallback(async (id: number) => {
    await deleteAsset(id);
    await fetchAll();
  }, [fetchAll]);

  // Mutasi aset (pindah site)
  const mutateAsset = useCallback(async (
    assetId: number,
    fromSiteCode: string | null,
    toSiteCode: string,
    notes: string
  ) => {
    // 1. Catat mutasi
    await createMutation({
      asset_id: assetId,
      from_site_code: fromSiteCode,
      to_site_code: toSiteCode,
      moved_by: HARDCODED_USER.telegram_id,
      notes: notes || null,
    });
    // 2. Update site_alias di master_assets
    await updateAsset(assetId, { site_alias: toSiteCode });
    await fetchAll();
  }, [fetchAll]);

  return {
    assets,
    mutations,
    sites,
    stats,
    loading,
    error,
    addAsset,
    editAsset,
    removeAsset,
    mutateAsset,
    refresh: fetchAll,
  };
}

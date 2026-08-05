import { useState, useCallback, useEffect, useMemo } from 'react';
import type { AssetDetail, MasterAsset, MutationDetail, Site, Category, AssetLoan } from '../types/inventory';
import { getAssets, createAsset, updateAsset, deleteAsset, getCategories } from '../services/assetService';
import { getMutations, createMutation, approveMutation } from '../services/mutationService';
import { getSites } from '../services/siteService';
import { getLoans, createLoanRequest, dispatchLoanUnit, receiveLoanUnit, initiateReturnLoan, closeLoanTicket, cancelLoanRequest, rejectLoanRequest, approveLoanRequest, forceCancelLoan } from '../services/loanService';

export function useInventory() {
  const [assets, setAssets] = useState<AssetDetail[]>([]);
  const [mutations, setMutations] = useState<MutationDetail[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loans, setLoans] = useState<AssetLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats computed dari assets dengan useMemo dan single iteration
  const stats = useMemo(() => {
    let active = 0, backup = 0, retired = 0, repair = 0, inTransit = 0, borrowed = 0;
    for (const a of assets) {
      switch (a.status) {
        case 'Active': active++; break;
        case 'Backup': backup++; break;
        case 'Retired': retired++; break;
        case 'Repair': repair++; break;
        case 'In Transit': inTransit++; break;
        case 'Borrowed': borrowed++; break;
      }
    }
    return {
      total: assets.length,
      active,
      backup,
      retired,
      repair,
      inTransit,
      borrowed,
    };
  }, [assets]);

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
        getLoans(),
      ]);

      if (results[0].status === 'fulfilled') setAssets(results[0].value);
      else { console.error('Error fetching assets:', results[0].reason); setError(prev => prev ? prev + ' | Error Assets' : 'Error fetch Assets'); }

      if (results[1].status === 'fulfilled') setMutations(results[1].value);
      else { console.error('Error fetching mutations:', results[1].reason); setError(prev => prev ? prev + ' | Error Mutasi' : 'Error fetch Mutasi'); }

      if (results[2].status === 'fulfilled') setSites(results[2].value);
      else { console.error('Error fetching sites:', results[2].reason); setError(prev => prev ? prev + ' | Error Sites' : 'Error fetch Sites'); }

      if (results[3].status === 'fulfilled') setCategories(results[3].value);
      else { console.error('Error fetching categories:', results[3].reason); setError(prev => prev ? prev + ' | Error Kategori' : 'Error fetch Kategori'); }

      if (results[4].status === 'fulfilled') setLoans(results[4].value);
      else { console.error('Error fetching loans:', results[4].reason); }
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

  const fetchAssetsAndMutations = useCallback(async () => {
    try {
      const [assetsRes, mutationsRes] = await Promise.allSettled([
        getAssets(),
        getMutations(),
      ]);
      if (assetsRes.status === 'fulfilled') setAssets(assetsRes.value);
      if (mutationsRes.status === 'fulfilled') setMutations(mutationsRes.value);
    } catch (err: any) {
      console.error('Error refreshing assets and mutations:', err.message);
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

  // Mutasi aset (Maker - Pending Handover) - hanya refresh aset & mutasi
  const mutateAsset = useCallback(async (
    assetId: number,
    fromSiteCode: string | null,
    toSiteCode: string,
    notes: string,
    movedBy: number = 0
  ) => {
    await createMutation({
      asset_id: assetId,
      from_site_code: fromSiteCode,
      to_site_code: toSiteCode,
      moved_by: movedBy,
      notes: notes || null,
    });
    // asset.site_alias TIDAK langsung diupdate! Statusnya saja jadi 'In Transit' di dalam createMutation
    await fetchAssetsAndMutations();
  }, [fetchAssetsAndMutations]);

  // Approve mutasi (Checker - Asset Received) - hanya refresh aset & mutasi
  const approveAssetMutation = useCallback(async (mutationId: number, assetId: number, toSiteCode: string, receivedBy: number = 0) => {
    await approveMutation(mutationId, assetId, toSiteCode, receivedBy);
    await fetchAssetsAndMutations();
  }, [fetchAssetsAndMutations]);

  // Actions untuk Asset Loans (Peminjaman & Unit Backup)
  const requestAssetLoan = useCallback(async (params: any) => {
    await createLoanRequest(params);
    await fetchAll();
  }, [fetchAll]);

  const dispatchAssetLoan = useCallback(async (params: any) => {
    await dispatchLoanUnit(params);
    await fetchAll();
  }, [fetchAll]);

  const receiveAssetLoan = useCallback(async (params: any) => {
    await receiveLoanUnit(params);
    await fetchAll();
  }, [fetchAll]);

  const initiateAssetLoanReturn = useCallback(async (loanId: number, assetId: number) => {
    await initiateReturnLoan(loanId, assetId);
    await fetchAll();
  }, [fetchAll]);

  const closeAssetLoanTicket = useCallback(async (params: any) => {
    await closeLoanTicket(params);
    await fetchAll();
  }, [fetchAll]);

  const cancelAssetLoan = useCallback(async (loanId: number, reason?: string, role?: string, userId?: number) => {
    await cancelLoanRequest(loanId, reason, role, userId);
    await fetchAll();
  }, [fetchAll]);

  const rejectAssetLoan = useCallback(async (loanId: number, rejectedBy: string, reason?: string, role?: string, userId?: number) => {
    await rejectLoanRequest(loanId, rejectedBy, reason, role, userId);
    await fetchAll();
  }, [fetchAll]);

  const approveAssetLoan = useCallback(async (loanId: number, approverId: number, approverName: string) => {
    await approveLoanRequest(loanId, approverId, approverName);
    await fetchAll();
  }, [fetchAll]);

  const forceCancelAssetLoan = useCallback(async (loanId: number, adminId: number, adminName: string, reason: string, currentAssetId?: number | null) => {
    await forceCancelLoan(loanId, adminId, adminName, reason, currentAssetId);
    await fetchAll();
  }, [fetchAll]);

  return {
    assets,
    mutations,
    sites,
    categories,
    loans,
    stats,
    loading,
    error,
    addAsset,
    editAsset,
    removeAsset,
    mutateAsset,
    approveAssetMutation,
    requestAssetLoan,
    dispatchAssetLoan,
    receiveAssetLoan,
    initiateAssetLoanReturn,
    closeAssetLoanTicket,
    cancelAssetLoan,
    rejectAssetLoan,
    approveAssetLoan,
    forceCancelAssetLoan,
    refresh: fetchAll,
  };
}


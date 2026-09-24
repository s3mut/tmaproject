import { supabase } from '../lib/supabase';
import type { MasterAsset, AssetDetail, Category, DisposalProposal } from '../types/inventory';

const PAGE_SIZE = 1000; // Batas default PostgREST per request

// Ambil SEMUA aset dari VIEW menggunakan pagination loop
// (PostgREST membatasi 1000 baris per request secara default)
export async function getAssets(): Promise<AssetDetail[]> {
  const allAssets: AssetDetail[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('view_assets_detail')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    const rows = data ?? [];
    allAssets.push(...rows);

    // Jika jumlah yang dikembalikan kurang dari PAGE_SIZE, berarti sudah halaman terakhir
    hasMore = rows.length === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  return allAssets;
}

// Tambah aset baru
export async function createAsset(
  asset: Omit<MasterAsset, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
): Promise<MasterAsset> {
  const { data, error } = await supabase
    .from('master_assets')
    .insert(asset)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Update aset
export async function updateAsset(
  id: number,
  asset: Partial<Omit<MasterAsset, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>>
): Promise<MasterAsset> {
  const { data, error } = await supabase
    .from('master_assets')
    .update(asset)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Hapus aset (Soft Delete)
export async function deleteAsset(id: number): Promise<void> {
  // Guard: Cek apakah aset sedang dalam transaksi aktif atau pending disposal
  const { data: asset, error: fetchErr } = await supabase
    .from('master_assets')
    .select('status')
    .eq('id', id)
    .single();

  if (fetchErr || !asset) throw new Error('Aset tidak ditemukan.');
  if (asset.status === 'PENDING_DISPOSAL') {
    throw new Error('Aset sedang dalam proses pemusnahan (Pending Disposal). Tidak dapat dihapus manual.');
  }

  // Guard: Cek transaksi aktif
  const { data: activeTrx, error: trxErr } = await supabase
    .from('asset_transactions')
    .select('id')
    .eq('asset_id', id)
    .not('status', 'in', '("Completed","Cancelled","Rejected")')
    .limit(1);

  if (trxErr) throw new Error('Gagal memeriksa status transaksi aset.');
  if (activeTrx && activeTrx.length > 0) {
    throw new Error('Aset sedang dalam proses transaksi (mutasi/peminjaman). Tidak dapat dihapus manual.');
  }

  const { error } = await supabase
    .from('master_assets')
    .update({ 
      deleted_at: new Date().toISOString(),
      status: 'Disposed' // Opsional: set status jadi disposed saat dihapus
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// Ambil Master Categories
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('master_categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// Ubah Status Aset (dengan Logging Audit Trail)
export async function changeAssetStatus(
  assetId: number,
  newStatus: string,
  telegramId: number,
  notes: string = ''
): Promise<void> {
  const { error } = await supabase.rpc('change_asset_status', {
    p_asset_id: assetId,
    p_new_status: newStatus,
    p_telegram_id: telegramId,
    p_notes: notes
  });

  if (error) throw new Error(error.message);
}

// Ambil Laporan Aset Retired
export async function getRetiredReports(telegramId?: number): Promise<any[]> {
  let query = supabase
    .from('view_retired_reports')
    .select('*')
    .order('retired_at', { ascending: false });
    
  if (telegramId) {
    query = query.eq('retired_by_id', telegramId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Batch Pemusnahan Massal Aset (menggunakan RPC atomic batch_approve_disposals)
export async function bulkDisposeAssets(
  disposals: Array<{ assetId: number; reason: string }>,
  telegramId: number,
  bastNo?: string
): Promise<void> {
  const assetIds = disposals.map(d => d.assetId);
  const bapa = bastNo ?? `BAPA-${Date.now()}`;

  const { data: result, error } = await supabase.rpc('batch_approve_disposals', {
    p_asset_ids: assetIds,
    p_bapa_no: bapa,
    p_approved_by: telegramId,
    p_notes: disposals.map(d => d.reason).join('; '),
  });

  if (error) throw new Error(error.message);
  if (result && !result.success) {
    throw new Error(`Batch disposal partially failed: ${result.failed} item gagal dari ${assetIds.length}`);
  }
}

// ── DISPOSAL WORKFLOW FUNCTIONS ───────────────────────────────────────────────

/**
 * Usulkan afkir aset secara Ad-Hoc atau dari jalur opname.
 * Memanggil RPC propose_asset_disposal yang:
 * 1. Set status aset → PENDING_DISPOSAL
 * 2. Insert ke disposal_proposals
 * 3. Catat di asset_movement_logs
 * Semua dalam satu transaksi atomic.
 */
export async function proposeDisposal(
  assetId: number,
  reasonCategory: string,
  proposedBy: number,
  options?: {
    reasonDetail?: string;
    photoUrl?: string;
    source?: 'AD_HOC' | 'OPNAME';
    opnameId?: number;
  }
): Promise<{ proposalId: number; serialNumber: string }> {
  const { data: result, error } = await supabase.rpc('propose_asset_disposal', {
    p_asset_id: assetId,
    p_reason_category: reasonCategory,
    p_reason_detail: options?.reasonDetail ?? null,
    p_photo_url: options?.photoUrl ?? null,
    p_proposed_by: proposedBy,
    p_source: options?.source ?? 'AD_HOC',
    p_opname_id: options?.opnameId ?? null,
  });

  if (error) throw new Error(error.message);

  const r = result as { success: boolean; error_code?: string; message?: string; proposal_id?: number; serial_number?: string };

  if (!r?.success) {
    throw new Error(r?.message ?? 'Gagal mengusulkan afkir aset.');
  }

  return {
    proposalId: r.proposal_id!,
    serialNumber: r.serial_number!,
  };
}

/**
 * Ambil antrean usulan afkir yang masih Pending.
 * Menggunakan view_disposal_queue yang sudah berisi join lengkap.
 */
export async function getDisposalQueue(
  region?: string
): Promise<DisposalProposal[]> {
  let query = supabase
    .from('view_disposal_queue')
    .select('*')
    .order('proposed_at', { ascending: true });

  if (region && region !== 'all') {
    query = query.eq('region', region);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as DisposalProposal[];
}

/**
 * Batch approval disposal oleh Super Admin.
 * Menggunakan RPC batch_approve_disposals yang atomic.
 */
export async function batchApproveDisposals(
  assetIds: number[],
  bapaNo: string,
  approvedBy: number,
  notes?: string
): Promise<{ processed: number; failed: number; results: any[] }> {
  const { data: result, error } = await supabase.rpc('batch_approve_disposals', {
    p_asset_ids: assetIds,
    p_bapa_no: bapaNo,
    p_approved_by: approvedBy,
    p_notes: notes ?? null,
  });

  if (error) throw new Error(error.message);

  const r = result as { success: boolean; processed: number; failed: number; bapa_no: string; results: any[] };
  return {
    processed: r?.processed ?? 0,
    failed: r?.failed ?? 0,
    results: r?.results ?? [],
  };
}

import { supabase } from '../lib/supabase';
import type { MasterAsset, AssetDetail, Category } from '../types/inventory';

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

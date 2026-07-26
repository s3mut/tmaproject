import { supabase } from '../lib/supabase';
import type { MasterAsset, AssetDetail } from '../types/inventory';

// Ambil semua aset dari VIEW (sudah include info site)
export async function getAssets(): Promise<AssetDetail[]> {
  const { data, error } = await supabase
    .from('view_assets_detail')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// Tambah aset baru
export async function createAsset(
  asset: Omit<MasterAsset, 'id' | 'created_at' | 'updated_at'>
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
  asset: Partial<Omit<MasterAsset, 'id' | 'created_at' | 'updated_at'>>
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

// Hapus aset
export async function deleteAsset(id: number): Promise<void> {
  const { error } = await supabase
    .from('master_assets')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

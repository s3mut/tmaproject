import { supabase } from '../lib/supabase';
import type { AssetMutation, MutationDetail } from '../types/inventory';

// Ambil riwayat mutasi dengan detail join
export async function getMutations(): Promise<MutationDetail[]> {
  // Supabase tidak bisa otomatis JOIN dari sini tanpa view,
  // sehingga kita fetch mutasi + join manual via JS
  const { data, error } = await supabase
    .from('asset_mutations')
    .select(`
      *,
      master_assets!asset_mutations_asset_id_fkey (
        serial_number,
        category,
        brand,
        model_type
      ),
      from_site:sites!asset_mutations_from_site_code_fkey (site_name),
      to_site:sites!asset_mutations_to_site_code_fkey (site_name),
      telegram_users!asset_mutations_moved_by_fkey (name)
    `)
    .order('mutation_date', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    asset_id: row.asset_id,
    from_site_code: row.from_site_code,
    to_site_code: row.to_site_code,
    moved_by: row.moved_by,
    notes: row.notes,
    mutation_date: row.mutation_date,
    asset_serial_number: row.master_assets?.serial_number ?? '-',
    asset_category: row.master_assets?.category ?? '-',
    asset_brand: row.master_assets?.brand ?? null,
    asset_model_type: row.master_assets?.model_type ?? null,
    from_site_name: row.from_site?.site_name ?? null,
    to_site_name: row.to_site?.site_name ?? '-',
    moved_by_name: row.telegram_users?.name ?? 'Unknown',
  }));
}

// Buat mutasi baru (pindah aset)
export async function createMutation(
  mutation: Omit<AssetMutation, 'id' | 'mutation_date'>
): Promise<AssetMutation> {
  const { data, error } = await supabase
    .from('asset_mutations')
    .insert(mutation)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

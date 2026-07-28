import { supabase } from '../lib/supabase';
import type { AssetMutation, MutationDetail } from '../types/inventory';

// Ambil riwayat mutasi dengan detail join
export async function getMutations(): Promise<MutationDetail[]> {
  // Attempt 1: Query dengan FK constraint names sesuai docs/schema.sql
  let { data, error } = await supabase
    .from('asset_mutations')
    .select(`
      *,
      master_assets!fk_mutation_asset (
        serial_number,
        category,
        brand,
        model_type
      ),
      from_site:sites!fk_mutation_from_site (site_name),
      to_site:sites!fk_mutation_to_site (site_name),
      telegram_users!fk_mutation_user (name)
    `)
    .order('mutation_date', { ascending: false })
    .limit(50);

  // Attempt 2: Fallback jika constraint name menggunakan penamaan default postgres
  if (error) {
    console.warn('[mutationService] Attempt 1 failed, trying default constraint names:', error.message);
    const res2 = await supabase
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
    
    data = res2.data;
    error = res2.error;
  }

  // Attempt 3: Fallback manual join jika relasi FK tidak terdaftar di schema cache PostgREST
  if (error || !data) {
    console.warn('[mutationService] Relational query failed, executing manual fallback join:', error?.message);
    const { data: rawMutations, error: rawErr } = await supabase
      .from('asset_mutations')
      .select('*')
      .order('mutation_date', { ascending: false })
      .limit(50);

    if (rawErr) throw new Error(rawErr.message);
    if (!rawMutations || rawMutations.length === 0) return [];

    // Fetch related tables secara terpisah agar data tetap tampil
    const [assetRes, siteRes, userRes] = await Promise.all([
      supabase.from('master_assets').select('id, serial_number, category, brand, model_type'),
      supabase.from('sites').select('site_code, site_name'),
      supabase.from('telegram_users').select('telegram_id, name'),
    ]);

    const assetMap = new Map((assetRes.data ?? []).map((a: any) => [a.id, a]));
    const siteMap = new Map((siteRes.data ?? []).map((s: any) => [s.site_code, s.site_name]));
    const userMap = new Map((userRes.data ?? []).map((u: any) => [u.telegram_id, u.name]));

    return rawMutations.map((row: any) => {
      const asset = assetMap.get(row.asset_id);
      return {
        id: row.id,
        asset_id: row.asset_id,
        from_site_code: row.from_site_code,
        to_site_code: row.to_site_code,
        moved_by: row.moved_by,
        notes: row.notes,
        mutation_date: row.mutation_date,
        asset_serial_number: asset?.serial_number ?? '-',
        asset_category: asset?.category ?? '-',
        asset_brand: asset?.brand ?? null,
        asset_model_type: asset?.model_type ?? null,
        from_site_name: row.from_site_code ? (siteMap.get(row.from_site_code) ?? null) : null,
        to_site_name: siteMap.get(row.to_site_code) ?? '-',
        moved_by_name: userMap.get(row.moved_by) ?? 'Unknown',
      };
    });
  }

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

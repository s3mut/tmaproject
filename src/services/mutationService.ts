import { supabase } from '../lib/supabase';
import type { AssetMutation, MutationDetail } from '../types/inventory';

// Ambil riwayat mutasi dengan detail join
export async function getMutations(): Promise<MutationDetail[]> {
  const { data: rawMutations, error: rawErr } = await supabase
    .from('asset_mutations')
    .select('*')
    .order('mutation_date', { ascending: false })
    .limit(50);

  if (rawErr) throw new Error(rawErr.message);
  if (!rawMutations || rawMutations.length === 0) return [];

  // Ekstraksi ID unik dari mutasi agar tidak men-download seluruh tabel ke memori browser
  const assetIds = Array.from(new Set(rawMutations.map((m: any) => m.asset_id).filter(Boolean)));
  const siteCodes = Array.from(
    new Set([
      ...rawMutations.map((m: any) => m.from_site_code),
      ...rawMutations.map((m: any) => m.to_site_code),
    ].filter(Boolean))
  );
  const userIds = Array.from(
    new Set([
      ...rawMutations.map((m: any) => m.moved_by),
      ...rawMutations.map((m: any) => m.received_by),
    ].filter(Boolean))
  );

  // Fetch only necessary rows via .in(), menghemat bandwidth dan RAM secara drastis
  const [assetRes, siteRes, userRes, catRes] = await Promise.all([
    assetIds.length > 0
      ? supabase.from('master_assets').select('id, serial_number, category_id, brand, model_type').in('id', assetIds)
      : { data: [] },
    siteCodes.length > 0
      ? supabase.from('sites').select('site_code, site_name, site_alias').in('site_code', siteCodes)
      : { data: [] },
    userIds.length > 0
      ? supabase.from('telegram_users').select('telegram_id, name').in('telegram_id', userIds)
      : { data: [] },
    supabase.from('master_categories').select('id, name'),
  ]);

  const assetMap = new Map((assetRes.data ?? []).map((a: any) => [a.id, a]));
  const siteMap = new Map((siteRes.data ?? []).map((s: any) => [s.site_code, s.site_name]));
  const userMap = new Map((userRes.data ?? []).map((u: any) => [u.telegram_id, u.name]));
  const catMap = new Map((catRes.data ?? []).map((c: any) => [c.id, c.name]));

  return rawMutations.map((row: any) => {
    const asset = assetMap.get(row.asset_id);
    return {
      id: row.id,
      asset_id: row.asset_id,
      from_site_code: row.from_site_code,
      to_site_code: row.to_site_code,
      moved_by: row.moved_by,
      notes: row.notes,
      status: row.status,
      received_by: row.received_by,
      received_at: row.received_at,
      mutation_date: row.mutation_date,
      asset_serial_number: asset?.serial_number ?? '-',
      asset_category_name: asset?.category_id ? (catMap.get(asset.category_id) ?? '-') : '-',
      asset_brand: asset?.brand ?? null,
      asset_model_type: asset?.model_type ?? null,
      from_site_name: row.from_site_code ? (siteMap.get(row.from_site_code) ?? null) : null,
      to_site_name: siteMap.get(row.to_site_code) ?? '-',
      moved_by_name: userMap.get(row.moved_by) ?? 'Unknown',
      received_by_name: row.received_by ? (userMap.get(row.received_by) ?? 'Unknown') : null,
    };
  });
}

// Buat mutasi baru (pindah aset) - Handover Protocol
export async function createMutation(
  mutation: Omit<AssetMutation, 'id' | 'mutation_date' | 'status' | 'received_by' | 'received_at'>
): Promise<AssetMutation> {
  // 1. Insert mutasi dengan status Pending
  const { data, error } = await supabase
    .from('asset_mutations')
    .insert({ ...mutation, status: 'Pending' })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // 2. Update status aset menjadi 'In Transit'
  await supabase
    .from('master_assets')
    .update({ status: 'In Transit' })
    .eq('id', mutation.asset_id);

  return data;
}

// Setujui mutasi yang Pending
export async function approveMutation(
  mutationId: number,
  assetId: number,
  toSiteCode: string,
  receivedBy: number
): Promise<void> {
  // 1. Dapatkan site_alias dari toSiteCode
  const { data: site } = await supabase
    .from('sites')
    .select('site_alias')
    .eq('site_code', toSiteCode)
    .single();

  if (!site) throw new Error('Site tujuan tidak ditemukan');

  // 2. Update mutasi menjadi Completed
  const { error: mutError } = await supabase
    .from('asset_mutations')
    .update({
      status: 'Completed',
      received_by: receivedBy,
      received_at: new Date().toISOString()
    })
    .eq('id', mutationId);

  if (mutError) throw new Error(mutError.message);

  // 3. Update aset lokasi ke site_alias baru dan status ke Active
  const { error: assetError } = await supabase
    .from('master_assets')
    .update({
      site_alias: site.site_alias,
      status: 'Active'
    })
    .eq('id', assetId);

  if (assetError) throw new Error(assetError.message);
}

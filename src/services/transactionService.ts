import { supabase } from '../lib/supabase';
import type { AssetTransaction, TransactionDetail } from '../types/inventory';

// Generate kode transaksi otomatis (contoh: TRX-2608-0001)
function generateTransactionCode(type: string): string {
  const prefix = type === 'Mutation' ? 'MUT' : type === 'Borrowing' ? 'BRW' : 'REP';
  const date = new Date();
  const ddmmyy = `${String(date.getDate()).padStart(2, '0')}${String(date.getMonth()+1).padStart(2, '0')}${String(date.getFullYear()).slice(2)}`;
  const randomId = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${ddmmyy}-${randomId}`;
}

// Ambil riwayat transaksi
export async function getTransactions(type?: 'Mutation' | 'Borrowing' | 'Repair'): Promise<TransactionDetail[]> {
  let query = supabase
    .from('asset_transactions')
    .select('*')
    .order('requested_at', { ascending: false })
    .limit(100);

  if (type) {
    query = query.eq('transaction_type', type);
  }

  const { data: rawData, error: rawErr } = await query;

  if (rawErr) throw new Error(rawErr.message);
  if (!rawData || rawData.length === 0) return [];

  const assetIds = Array.from(new Set(rawData.map((m: any) => m.asset_id).filter(Boolean)));
  const siteCodes = Array.from(
    new Set([
      ...rawData.map((m: any) => m.from_site_code),
      ...rawData.map((m: any) => m.to_site_code),
    ].filter(Boolean))
  );
  const userIds = Array.from(
    new Set([
      ...rawData.map((m: any) => m.requested_by),
      ...rawData.map((m: any) => m.approved_by),
      ...rawData.map((m: any) => m.dispatched_by),
      ...rawData.map((m: any) => m.received_by),
    ].filter(Boolean))
  );

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

  return rawData.map((row: any) => {
    const asset = row.asset_id ? assetMap.get(row.asset_id) : null;
    return {
      ...row,
      asset_serial_number: asset?.serial_number ?? '-',
      asset_category_name: asset?.category_id ? (catMap.get(asset.category_id) ?? (row.category_id ? catMap.get(row.category_id) : '-')) : (row.category_id ? catMap.get(row.category_id) : '-'),
      asset_brand: asset?.brand ?? null,
      asset_model_type: asset?.model_type ?? null,
      from_site_name: row.from_site_code ? (siteMap.get(row.from_site_code) ?? null) : null,
      to_site_name: row.to_site_code ? (siteMap.get(row.to_site_code) ?? '-') : null,
      requested_by_name: userMap.get(row.requested_by) ?? 'Unknown',
      approved_by_name: row.approved_by ? (userMap.get(row.approved_by) ?? 'Unknown') : null,
      dispatched_by_name: row.dispatched_by ? (userMap.get(row.dispatched_by) ?? 'Unknown') : null,
      received_by_name: row.received_by ? (userMap.get(row.received_by) ?? 'Unknown') : null,
    };
  });
}

// Buat request transaksi baru
export async function createTransaction(
  trx: Omit<AssetTransaction, 'id' | 'transaction_code' | 'status' | 'requested_at' | 'approved_at' | 'dispatched_at' | 'received_at' | 'completed_at'>
): Promise<AssetTransaction> {
  const trxCode = generateTransactionCode(trx.transaction_type);
  
  const { data, error } = await supabase
    .from('asset_transactions')
    .insert({ 
      ...trx, 
      transaction_code: trxCode,
      status: 'Requested' 
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Update status transaksi
export async function updateTransactionStatus(
  transactionId: number,
  newStatus: string,
  userId: number,
  assetId?: number,
  notes?: string
): Promise<void> {
  
  const updates: any = { 
    status: newStatus 
  };

  if (notes) updates.notes = notes;
  if (assetId) updates.asset_id = assetId;

  const now = new Date().toISOString();

  if (newStatus === 'Approved') {
    updates.approved_by = userId;
    updates.approved_at = now;
  } else if (newStatus === 'In Transit') {
    updates.dispatched_by = userId;
    updates.dispatched_at = now;
  } else if (newStatus === 'In Progress') {
    updates.received_by = userId;
    updates.received_at = now;
  } else if (newStatus === 'Completed') {
    updates.completed_at = now;
  }

  const { error } = await supabase
    .from('asset_transactions')
    .update(updates)
    .eq('id', transactionId);

  if (error) throw new Error(error.message);

  // Jika transaksi selesai, perbarui lokasi fisik aset (master_assets)
  if (newStatus === 'Completed') {
    // Ambil detail transaksi untuk mengetahui to_site_code dan asset_id
    const { data: trxData, error: trxErr } = await supabase
      .from('asset_transactions')
      .select('asset_id, to_site_code, transaction_type')
      .eq('id', transactionId)
      .single();

    if (trxErr || !trxData) {
      console.error('Gagal mengambil data transaksi untuk update lokasi fisik', trxErr);
      return;
    }

    if (trxData.asset_id && trxData.to_site_code && (trxData.transaction_type === 'Mutation' || trxData.transaction_type === 'Borrowing')) {
      const { error: assetErr } = await supabase
        .from('master_assets')
        .update({ site_alias: trxData.to_site_code })
        .eq('id', trxData.asset_id);

      if (assetErr) {
        console.error('Gagal memperbarui lokasi fisik aset', assetErr);
        throw new Error('Transaksi berhasil, tetapi gagal memperbarui lokasi aset fisik.');
      }
    }
  }
}

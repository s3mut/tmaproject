import { supabase } from '../lib/supabase';
import type { AssetTransaction, TransactionDetail, AssetMovementLog } from '../types/inventory';
import { assertTransition, isDocumentLocked } from './stateMachine';

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
      ? supabase.from('sites').select('site_code, site_name, site_alias, region').in('site_code', siteCodes)
      : { data: [] },
    userIds.length > 0
      ? supabase.from('telegram_users').select('telegram_id, name').in('telegram_id', userIds)
      : { data: [] },
    supabase.from('master_categories').select('id, name'),
  ]);

  const assetMap = new Map((assetRes.data ?? []).map((a: any) => [a.id, a]));
  const siteMap = new Map((siteRes.data ?? []).map((s: any) => [s.site_code, s]));
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
      from_site_name: row.from_site_code ? (siteMap.get(row.from_site_code)?.site_name ?? null) : null,
      to_site_name: row.to_site_code ? (siteMap.get(row.to_site_code)?.site_name ?? '-') : null,
      to_site_region: row.to_site_code ? (siteMap.get(row.to_site_code)?.region ?? null) : null,
      requested_by_name: userMap.get(row.requested_by) ?? 'Unknown',
      approved_by_name: row.approved_by ? (userMap.get(row.approved_by) ?? 'Unknown') : null,
      dispatched_by_name: row.dispatched_by ? (userMap.get(row.dispatched_by) ?? 'Unknown') : null,
      received_by_name: row.received_by ? (userMap.get(row.received_by) ?? 'Unknown') : null,
    };
  });
}

// Ambil detail satu transaksi beserta join
export async function getTransactionDetailById(id: number): Promise<TransactionDetail | null> {
  const { data: rawData, error: rawErr } = await supabase
    .from('asset_transactions')
    .select('*')
    .eq('id', id)
    .single();

  if (rawErr) {
    if (rawErr.code === 'PGRST116') return null; // Not found
    throw new Error(rawErr.message);
  }
  if (!rawData) return null;

  const row = rawData;
  const assetIds = row.asset_id ? [row.asset_id] : [];
  const siteCodes = Array.from(new Set([row.from_site_code, row.to_site_code].filter(Boolean)));
  const userIds = Array.from(new Set([row.requested_by, row.approved_by, row.dispatched_by, row.received_by].filter(Boolean)));

  const [assetRes, siteRes, userRes, catRes] = await Promise.all([
    assetIds.length > 0
      ? supabase.from('master_assets').select('id, serial_number, category_id, brand, model_type').in('id', assetIds)
      : { data: [] },
    siteCodes.length > 0
      ? supabase.from('sites').select('site_code, site_name, site_alias, region').in('site_code', siteCodes)
      : { data: [] },
    userIds.length > 0
      ? supabase.from('telegram_users').select('telegram_id, name').in('telegram_id', userIds)
      : { data: [] },
    supabase.from('master_categories').select('id, name'),
  ]);

  const assetMap = new Map((assetRes.data ?? []).map((a: any) => [a.id, a]));
  const siteMap = new Map((siteRes.data ?? []).map((s: any) => [s.site_code, s]));
  const userMap = new Map((userRes.data ?? []).map((u: any) => [u.telegram_id, u.name]));
  const catMap = new Map((catRes.data ?? []).map((c: any) => [c.id, c.name]));

  const asset = row.asset_id ? assetMap.get(row.asset_id) : null;
  return {
    ...row,
    asset_serial_number: asset?.serial_number ?? '-',
    asset_category_name: asset?.category_id ? (catMap.get(asset.category_id) ?? (row.category_id ? catMap.get(row.category_id) : '-')) : (row.category_id ? catMap.get(row.category_id) : '-'),
    asset_brand: asset?.brand ?? null,
    asset_model_type: asset?.model_type ?? null,
    from_site_name: row.from_site_code ? (siteMap.get(row.from_site_code)?.site_name ?? null) : null,
    to_site_name: row.to_site_code ? (siteMap.get(row.to_site_code)?.site_name ?? '-') : null,
    to_site_region: row.to_site_code ? (siteMap.get(row.to_site_code)?.region ?? null) : null,
    requested_by_name: userMap.get(row.requested_by) ?? 'Unknown',
    approved_by_name: row.approved_by ? (userMap.get(row.approved_by) ?? 'Unknown') : null,
    dispatched_by_name: row.dispatched_by ? (userMap.get(row.dispatched_by) ?? 'Unknown') : null,
    received_by_name: row.received_by ? (userMap.get(row.received_by) ?? 'Unknown') : null,
  };
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
      status: 'Requested',
      doc_status: 0,  // Selalu mulai sebagai Draft
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Trigger Telegram Bot Notification via Edge Function
  try {
    const [assetRes, userRes, siteRes] = await Promise.all([
      trx.asset_id ? supabase.from('master_assets').select('brand, model_type').eq('id', trx.asset_id).single() : { data: null },
      supabase.from('telegram_users').select('name').eq('telegram_id', trx.requested_by).single(),
      trx.to_site_code ? supabase.from('sites').select('region').eq('site_code', trx.to_site_code).single() : { data: null }
    ]);

    const assetBrand = assetRes.data?.brand || '';
    const assetModel = assetRes.data?.model_type || 'Unknown Asset';
    const reqByName = userRes.data?.name || 'Unknown User';
    const targetRegion = siteRes.data?.region || 'Tanpa Region';

    const { data: fnRes, error: fnErr } = await supabase.functions.invoke('telegram-bot/notify', {
      body: {
        transaction_id: data.id,
        type: trx.transaction_type,
        asset_brand: assetBrand,
        asset_model: assetModel,
        from_site: trx.from_site_code || 'Unknown',
        to_site: trx.to_site_code || 'Unknown',
        target_region: targetRegion,
        requested_by_name: reqByName
      }
    });

    if (fnErr) {
      let errBody: unknown = null;
      try { errBody = await (fnErr as any).context?.json?.(); } catch {}
      console.error('[TransactionService] Gagal kirim notifikasi telegram-bot/notify:', {
        message: fnErr.message,
        status: (fnErr as any).context?.status,
        body: errBody
      });
    } else {
      console.log('[TransactionService] Notifikasi transaksi berhasil dikirim ke Telegram:', fnRes);
    }
  } catch (err) {
    console.error('[TransactionService] Exception saat memanggil telegram-bot/notify:', err);
    // Tidak throw error agar transaksi tetap sukses tersimpan di database
  }

  return data;
}

/**
 * Update status transaksi — VERSI BARU dengan:
 * 1. Validasi State Machine sebelum hit database
 * 2. RPC update_transaction_status_safe() untuk anti-race condition via advisory lock
 * 3. Response error yang informatif untuk concurrent modification
 */
export async function updateTransactionStatus(
  transactionId: number,
  newStatus: string,
  userId: number,
  assetId?: number,
  notes?: string
): Promise<AssetTransaction> {
  // ── STEP 1: Baca status saat ini untuk validasi lokal ──────────────────────
  const { data: currentTrx, error: fetchErr } = await supabase
    .from('asset_transactions')
    .select('status, doc_status, transaction_type')
    .eq('id', transactionId)
    .single();

  if (fetchErr || !currentTrx) {
    throw new Error('Gagal membaca data transaksi: ' + (fetchErr?.message ?? 'Not found'));
  }

  const currentStatus = currentTrx.status as import('../types/inventory').TransactionStatus;
  const typedNewStatus = newStatus as import('../types/inventory').TransactionStatus;

  // ── STEP 2: Periksa DocStatus — dokumen terkunci tidak bisa diubah ─────────
  if (isDocumentLocked(currentStatus, currentTrx.doc_status)) {
    throw new Error(
      `Dokumen transaksi ini sudah dikunci (status: ${currentStatus}, doc_status: ${currentTrx.doc_status}). ` +
      `Tidak dapat melakukan perubahan.`
    );
  }

  // ── STEP 3: Validasi State Machine lokal (early fail sebelum round-trip DB) ─
  assertTransition(currentStatus, typedNewStatus);

  // ── STEP 4: Panggil RPC safe update (advisory lock + optimistic locking) ────
  const { data: rpcResult, error: rpcErr } = await supabase.rpc('update_transaction_status_safe', {
    p_transaction_id: transactionId,
    p_expected_current_status: currentStatus,
    p_new_status: newStatus,
    p_user_id: userId,
    p_notes: notes ?? null,
    p_asset_id: assetId ?? null,
  });

  if (rpcErr) {
    throw new Error(`Database error: ${rpcErr.message}`);
  }

  // ── STEP 5: Interpretasi response dari RPC ────────────────────────────────
  const result = rpcResult as {
    success: boolean;
    error_code?: string;
    message?: string;
    current_status?: string;
  };

  if (!result?.success) {
    const errCode = result?.error_code ?? 'UNKNOWN_ERROR';
    const errMsg = result?.message ?? 'Terjadi kesalahan yang tidak diketahui.';

    switch (errCode) {
      case 'CONCURRENT_MODIFICATION':
        throw new Error(
          `⚡ Konflik: ${errMsg}\n` +
          `Status saat ini di server: "${result.current_status}". Silakan refresh halaman.`
        );
      case 'DOCUMENT_LOCKED':
        throw new Error(`🔒 ${errMsg}`);
      case 'INVALID_TRANSITION':
        throw new Error(`🚫 ${errMsg}`);
      case 'NOT_FOUND':
        throw new Error(`❓ ${errMsg}`);
      default:
        throw new Error(`❌ ${errMsg}`);
    }
  }

  // ── STEP 6: Kirim notifikasi Telegram untuk status 'In Transit' ───────────
  if (newStatus === 'In Transit') {
    try {
      const { data: trxFull } = await supabase
        .from('asset_transactions')
        .select('transaction_code, transaction_type, requested_by, asset_id')
        .eq('id', transactionId)
        .single();

      if (trxFull) {
        const { data: assetData } = await supabase
          .from('master_assets')
          .select('serial_number, brand, model_type')
          .eq('id', trxFull.asset_id)
          .single();

        const { data: dispRes, error: dispErr } = await supabase.functions.invoke('telegram-bot/dispatch', {
          body: {
            transaction_code: trxFull.transaction_code,
            type: trxFull.transaction_type,
            requested_by: trxFull.requested_by,
            asset_brand: assetData?.brand || '',
            asset_model: assetData?.model_type || '',
            serial_number: assetData?.serial_number || ''
          }
        });

        if (dispErr) {
          let errBody: unknown = null;
          try { errBody = await (dispErr as any).context?.json?.(); } catch {}
          console.error('[TransactionService] Gagal kirim notifikasi dispatch:', {
            message: dispErr.message, status: (dispErr as any).context?.status, body: errBody
          });
        } else {
          console.log('[TransactionService] Notifikasi dispatch berhasil dikirim:', dispRes);
        }
      }
    } catch (err) {
      console.error('[TransactionService] Exception saat invoke telegram-bot dispatch:', err);
    }
  }

  // ── STEP 7: Ambil state terbaru setelah update dan kembalikan ────────────
  const { data: updatedTrx, error: refetchErr } = await supabase
    .from('asset_transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (refetchErr) throw new Error('Gagal mengambil data transaksi terbaru setelah di-update.');
  return updatedTrx;
}

/**
 * Ambil timeline pergerakan aset dari view_asset_timeline (Immutable Ledger).
 * Digunakan oleh komponen DocumentTimeline.
 */
export async function getAssetTimeline(assetId: number): Promise<AssetMovementLog[]> {
  const { data, error } = await supabase
    .from('view_asset_timeline')
    .select('*')
    .eq('asset_id', assetId)
    .order('logged_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as AssetMovementLog[];
}

/**
 * Ambil daftar ID aset yang sedang dalam transaksi aktif (tidak completed/cancelled/rejected).
 * Digunakan untuk mengisi lockedAssetIds secara akurat tanpa limit.
 */
export async function getActiveTransactionAssetIds(): Promise<number[]> {
  const { data, error } = await supabase
    .from('asset_transactions')
    .select('asset_id')
    .not('status', 'in', '("Completed","Cancelled","Rejected")')
    .not('asset_id', 'is', null);

  if (error) throw new Error(error.message);
  return Array.from(new Set((data ?? []).map((row: any) => row.asset_id)));
}

/**
 * Insert manual ke asset_movement_logs (untuk event yang tidak ter-cover oleh RPC).
 * Contoh: LOAN_DISPATCH saat status berubah ke 'In Transit'.
 */
export async function insertMovementLog(log: {
  asset_id: number;
  serial_number: string;
  event_type: string;
  document_code?: string;
  from_site_code?: string;
  to_site_code?: string;
  executor_id?: number;
  executor_name?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase
    .from('asset_movement_logs')
    .insert({
      ...log,
      metadata: log.metadata ?? {},
    });

  if (error) {
    // Log tapi jangan throw — movement log bersifat opsional, jangan blokir main flow
    console.error('[TransactionService] Gagal insert movement log:', error.message);
  }
}

/**
 * Mencatat checkpoint transit secara aman via RPC.
 */
export async function logTransitCheckpoint(
  transactionId: number,
  siteCode: string,
  executorId: number,
  notes?: string
): Promise<{ success: boolean; message?: string }> {
  const { data, error } = await supabase.rpc('log_transit_checkpoint', {
    p_transaction_id: transactionId,
    p_site_code: siteCode,
    p_executor_id: executorId,
    p_notes: notes ?? null,
  });
  if (error) throw error;
  return data;
}

import { supabase } from '../lib/supabase';
import type { AssetLoan } from '../types/inventory';

/**
 * Mengambil daftar seluruh peminjaman aset (Asset Loans)
 * Beserta pengayaan data relasional (Asset S/N, Brand, dan Lokasi Site)
 */
export async function getLoans(): Promise<AssetLoan[]> {
  const { data: rawLoans, error: rawErr } = await supabase
    .from('asset_loans')
    .select('*')
    .order('created_at', { ascending: false });

  if (rawErr) {
    // Jika tabel belum dibuat di Supabase (misalnya user belum menjalankan migrasi SQL), return [] agar aplikasi tidak crash
    if (rawErr.code === '42P01' || rawErr.message.includes('not find') || rawErr.message.includes('does not exist')) {
      console.warn('Tabel asset_loans belum terpasang di Supabase. Silakan jalankan sql/create_asset_loans.sql');
      return [];
    }
    throw new Error(rawErr.message);
  }

  if (!rawLoans || rawLoans.length === 0) return [];

  // Ekstraksi ID unik untuk batch reading hemat RAM
  const assetIds = Array.from(new Set(rawLoans.map((l: any) => l.asset_id).filter(Boolean)));
  const siteAliases = Array.from(new Set(rawLoans.map((l: any) => l.site_alias).filter(Boolean)));

  const [assetRes, siteRes] = await Promise.all([
    assetIds.length > 0
      ? supabase.from('master_assets').select('id, serial_number, brand, model_type').in('id', assetIds)
      : { data: [] },
    siteAliases.length > 0
      ? supabase.from('sites').select('site_alias, site_name, region').in('site_alias', siteAliases)
      : { data: [] },
  ]);

  const assetsMap: Record<number, any> = {};
  (assetRes.data || []).forEach((a: any) => { assetsMap[a.id] = a; });

  const sitesMap: Record<string, any> = {};
  (siteRes.data || []).forEach((s: any) => { if (s.site_alias) sitesMap[s.site_alias.toLowerCase()] = s; });

  return rawLoans.map((loan: any) => {
    const a = loan.asset_id ? assetsMap[loan.asset_id] : null;
    const s = sitesMap[(loan.site_alias || '').toLowerCase()];

    return {
      ...loan,
      asset_serial_number: a?.serial_number || undefined,
      asset_brand: a?.brand || null,
      asset_model_type: a?.model_type || null,
      site_name: s?.site_name || loan.site_alias,
      site_region: s?.region || null,
    };
  });
}

/**
 * Fase 1: Pengajuan Peminjaman oleh User/Toko
 */
export async function createLoanRequest(params: {
  siteAlias: string;
  categoryName: string;
  purpose: string;
  durationDays: number;
  shippingMethod: 'Pick-up' | 'Delivery' | string;
  requestedById: number;
  requestedByName: string;
  notes?: string;
  isCrossRegion?: boolean;
}): Promise<string> {
  const yymm = new Date().toISOString().slice(2, 7).replace('-', '');
  const cleanSite = (params.siteAlias || 'TKO').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  // Generate 4 digit random sequence + timestamp short suffix agar anti-duplikasi 100%
  const randomSeq = Math.floor(1000 + Math.random() * 9000);
  const loanCode = `LOAN-${cleanSite}-${yymm}-${randomSeq}`;

  const requiresApproval = params.durationDays > 14;
  const dueDate = new Date(Date.now() + (params.durationDays * 24 * 60 * 60 * 1000)).toISOString();
  const initialStatus = params.isCrossRegion ? 'Waiting Admin Approval' : 'Requested';

  const { error } = await supabase.from('asset_loans').insert({
    loan_code: loanCode,
    site_alias: params.siteAlias.toUpperCase(),
    category_name: params.categoryName,
    purpose: params.purpose,
    duration_days: params.durationDays,
    requires_it_approval: requiresApproval,
    due_date: dueDate,
    shipping_method: params.shippingMethod,
    status: initialStatus,
    is_cross_region: !!params.isCrossRegion,
    requested_by_id: params.requestedById,
    requested_by_name: params.requestedByName,
    notes: params.notes || null,
  });

  if (error) throw new Error(`Gagal mengajukan pinjaman: ${error.message}`);
  return loanCode;
}

/**
 * Fase 2: Alokasi & Pengiriman (Dispatch) oleh Tim IT/Gudang via Barcode Scanner
 */
export async function dispatchLoanUnit(params: {
  loanId: number;
  assetId: number;
  shippingMethod: string;
  trackingNumber?: string;
  dispatchedByName: string;
  durationDays: number;
}): Promise<void> {
  // Hitung ulang due_date tepat dari tanggal dispatch / penyerahan ini
  const newDueDate = new Date(Date.now() + (params.durationDays * 24 * 60 * 60 * 1000)).toISOString();
  const nowStr = new Date().toISOString();

  // 1. Update tiket peminjaman ke In-Transit
  const { error: loanErr } = await supabase
    .from('asset_loans')
    .update({
      asset_id: params.assetId,
      shipping_method: params.shippingMethod,
      tracking_number: params.trackingNumber || null,
      dispatched_by_name: params.dispatchedByName,
      dispatched_at: nowStr,
      due_date: newDueDate,
      status: 'In-Transit',
      requires_it_approval: false, // Disetujui IT saat pengiriman
    })
    .eq('id', params.loanId);

  if (loanErr) throw new Error(`Gagal update tiket pinjam: ${loanErr.message}`);

  // 2. Ubah status fisik unit di master_assets ke In Transit
  const { error: assetErr } = await supabase
    .from('master_assets')
    .update({ status: 'In Transit', updated_at: nowStr })
    .eq('id', params.assetId);

  if (assetErr) throw new Error(`Gagal update status aset fisik: ${assetErr.message}`);
}

/**
 * Fase 3: Penerimaan (Receiving) oleh Toko via Barcode Scanner / Klik Terima
 */
export async function receiveLoanUnit(params: {
  loanId: number;
  assetId: number;
  siteAlias: string;
  receivedByName: string;
}): Promise<void> {
  const nowStr = new Date().toISOString();

  // 1. Ubah tiket jadi Borrowed
  const { error: loanErr } = await supabase
    .from('asset_loans')
    .update({
      status: 'Borrowed',
      received_by_name: params.receivedByName,
      received_at: nowStr,
    })
    .eq('id', params.loanId);

  if (loanErr) throw new Error(`Gagal mengonfirmasi penerimaan: ${loanErr.message}`);

  // 2. Ubah master aset jadi Borrowed dan pindahkan lokasi ke site Toko
  const { error: assetErr } = await supabase
    .from('master_assets')
    .update({
      status: 'Borrowed',
      site_alias: params.siteAlias,
      updated_at: nowStr,
    })
    .eq('id', params.assetId);

  if (assetErr) throw new Error(`Gagal meminjamkan unit ke site toko: ${assetErr.message}`);
}

/**
 * Perpanjangan Durasi Peminjaman (> 14 hari atau masa tambahan)
 * Jika disetujui oleh IT Officer (Role: user / admin), langsung dikunci bertambah harinya.
 */
export async function extendLoanDuration(params: {
  loanId: number;
  currentDueDate: string;
  additionalDays: number;
  isItOfficer: boolean;
  notes?: string;
}): Promise<void> {
  const newDue = new Date(new Date(params.currentDueDate).getTime() + (params.additionalDays * 24 * 60 * 60 * 1000)).toISOString();

  if (params.isItOfficer) {
    // IT langsung meng-approve tambahan durasi
    const { error } = await supabase
      .from('asset_loans')
      .update({
        due_date: newDue,
        requires_it_approval: false,
        notes: params.notes ? `[IT Approved +${params.additionalDays} hari]: ${params.notes}` : undefined,
      })
      .eq('id', params.loanId);

    if (error) throw new Error(error.message);
  } else {
    // Peminjam mengajukan permohonan ke IT (requires_it_approval -> true)
    const { error } = await supabase
      .from('asset_loans')
      .update({
        requires_it_approval: true,
        notes: `[Permohonan Tambah +${params.additionalDays} Hari Menunggu IT Approval] - ${params.notes || ''}`,
      })
      .eq('id', params.loanId);

    if (error) throw new Error(error.message);
  }
}

/**
 * Fase 5: Inisiasi Pengembalian (Return) dari Toko ke IT
 */
export async function initiateReturnLoan(loanId: number, assetId: number): Promise<void> {
  const nowStr = new Date().toISOString();
  const { error: loanErr } = await supabase
    .from('asset_loans')
    .update({ status: 'Return In-Transit', returned_at: nowStr })
    .eq('id', loanId);

  if (loanErr) throw new Error(loanErr.message);

  if (assetId) {
    await supabase.from('master_assets').update({ status: 'In Transit', updated_at: nowStr }).eq('id', assetId);
  }
}

/**
 * Fase 5 Selesai: Tim IT menyeken barang kembalian dan mengecek kondisi fisik
 */
export async function closeLoanTicket(params: {
  loanId: number;
  assetId: number;
  condition: 'Bagus' | 'Rusak' | 'Hilang' | string;
  itName: string;
  notes?: string;
}): Promise<void> {
  const nowStr = new Date().toISOString();

  // 1. Tutup tiket peminjaman
  const { error: loanErr } = await supabase
    .from('asset_loans')
    .update({
      status: 'Closed',
      condition_on_return: params.condition,
      closed_at: nowStr,
      notes: params.notes || `Diterima kembali oleh IT (${params.itName}) dalam kondisi: ${params.condition}`,
    })
    .eq('id', params.loanId);

  if (loanErr) throw new Error(`Gagal menutup tiket: ${loanErr.message}`);

  // 2. Tentukan status baru aset di Master Asset berdasarkan kondisi balikan
  let nextStatus = 'Backup'; // Jika bagus, kembali ready as Backup di gudang IT
  if (params.condition === 'Rusak') nextStatus = 'Repair';
  if (params.condition === 'Hilang') nextStatus = 'Disposed';

  const { error: assetErr } = await supabase
    .from('master_assets')
    .update({
      status: nextStatus,
      updated_at: nowStr,
      // Jika kembalian Bagus / Rusak, kembalikan lokasi ke null (gudang pusat / workshop) atau biarkan untuk disetel IT
      site_alias: params.condition === 'Hilang' ? undefined : null,
    })
    .eq('id', params.assetId);

  if (assetErr) throw new Error(`Gagal mereset status master aset: ${assetErr.message}`);
}

/**
 * Persetujuan tiket (Approve) oleh IT Region atau Admin Global (Khusus Cross-Region / Durasi > 14 hari)
 */
export async function approveLoanRequest(loanId: number, approverId: number, approverName: string): Promise<void> {
  const { error } = await supabase
    .from('asset_loans')
    .update({
      status: 'Approved',
      approved_by_id: approverId,
      approved_by_name: approverName,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', loanId);

  if (error) throw new Error(`Gagal menyetujui pengajuan: ${error.message}`);
}

/**
 * Membatalkan pengajuan pinjam oleh pengaju sendiri (Role Toko / Guest / Creator / User)
 */
export async function cancelLoanRequest(loanId: number, reason?: string, role = 'guest', userId?: number): Promise<void> {
  const nowStr = new Date().toISOString();
  const { error } = await supabase
    .from('asset_loans')
    .update({
      status: 'Cancelled',
      notes: reason || 'Dibatalkan mandiri oleh pengaju.',
      cancellation_reason: reason || 'Dibatalkan mandiri oleh pengaju.',
      cancelled_by_role: role,
      cancelled_by_id: userId || null,
      cancelled_at: nowStr,
      updated_at: nowStr,
    })
    .eq('id', loanId);

  if (error) throw new Error(`Gagal membatalkan pengajuan: ${error.message}`);
}

/**
 * Menolak pengajuan pinjam oleh Tim IT Support / Admin dengan alasan terstruktur
 */
export async function rejectLoanRequest(loanId: number, rejectedBy: string, reason?: string, role = 'user', userId?: number): Promise<void> {
  const nowStr = new Date().toISOString();
  const { error } = await supabase
    .from('asset_loans')
    .update({
      status: 'Rejected',
      notes: `Ditolak oleh Tim IT (${rejectedBy}): ${reason || 'Tidak memenuhi kualifikasi / stok kosong.'}`,
      cancellation_reason: reason || 'Ditolak oleh Tim IT Support.',
      cancelled_by_role: role,
      cancelled_by_id: userId || null,
      cancelled_at: nowStr,
      updated_at: nowStr,
    })
    .eq('id', loanId);

  if (error) throw new Error(`Gagal menolak pengajuan: ${error.message}`);
}

/**
 * Admin "God Mode": Force Cancel tiket di tahapan apa saja dengan pemulihan status fisik aset
 */
export async function forceCancelLoan(
  loanId: number,
  adminId: number,
  adminName: string,
  reason: string,
  currentAssetId?: number | null
): Promise<void> {
  const nowStr = new Date().toISOString();

  // 1. Jika sudah sempat ada aset fisik yang dipindahkan/dipinjam, kembalikan statusnya jadi 'Backup'
  if (currentAssetId) {
    const { error: assetErr } = await supabase
      .from('master_assets')
      .update({
        status: 'Backup',
        updated_at: nowStr,
      })
      .eq('id', currentAssetId);

    if (assetErr) {
      console.warn('Gagal mereset status aset di Master Asset saat Force Cancel:', assetErr);
    }
  }

  // 2. Update tiket ke Cancelled dengan audit trail God Mode
  const { error: loanErr } = await supabase
    .from('asset_loans')
    .update({
      status: 'Cancelled',
      notes: `⚡ FORCE CANCELLED BY GLOBAL ADMIN (${adminName}): ${reason}`,
      cancellation_reason: `⚡ GOD MODE OVERRIDE: ${reason}`,
      cancelled_by_role: 'admin',
      cancelled_by_id: adminId,
      cancelled_at: nowStr,
      force_cancelled_at: nowStr,
      updated_at: nowStr,
    })
    .eq('id', loanId);

  if (loanErr) throw new Error(`Gagal melakukan Force Cancel (God Mode): ${loanErr.message}`);
}

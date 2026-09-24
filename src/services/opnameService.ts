/**
 * opnameService.ts — Service untuk Stock Opname & Reconciliation Workflow
 *
 * Aturan bisnis kritis:
 * - Opname TIDAK BOLEH langsung mengubah status aset.
 * - Semua perubahan harus melalui alur:
 *   Opname → Draft Rekonsiliasi → Submit → Super Admin Approve → Eksekusi Perubahan
 */

import { supabase } from '../lib/supabase';
import type {
  StockReconciliation,
  StockReconciliationItem,
  StockOpname,
  StockOpnameDetail,
  ProposedActionType,
} from '../types/inventory';

// ── Helper ────────────────────────────────────────────────────────────────────

function generateReconciliationCode(siteAlias: string): string {
  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  const seq = String(Math.floor(100 + Math.random() * 900));
  const site = (siteAlias ?? 'UNKN').toUpperCase();
  return `RECON-${site}-${yyyymmdd}-${seq}`;
}

// ── Opname Sessions ───────────────────────────────────────────────────────────

/**
 * Buat sesi opname baru.
 */
export async function createOpnameSession(
  siteAlias: string,
  conductedBy: number,
  notes?: string
): Promise<StockOpname> {
  const { data, error } = await supabase
    .from('stock_opname')
    .insert({ site_alias: siteAlias, conducted_by: conductedBy, notes: notes ?? null })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Ambil sesi opname beserta detailnya.
 */
export async function getOpnameSessions(siteAlias?: string): Promise<StockOpname[]> {
  let q = supabase
    .from('stock_opname')
    .select('*')
    .order('start_date', { ascending: false })
    .limit(50);

  if (siteAlias) q = q.eq('site_alias', siteAlias);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Ambil detail scan satu sesi opname.
 */
export async function getOpnameDetails(opnameId: number): Promise<StockOpnameDetail[]> {
  const { data, error } = await supabase
    .from('stock_opname_details')
    .select('*')
    .eq('opname_id', opnameId)
    .order('scanned_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Tambahkan satu item scan ke sesi opname.
 */
export async function addOpnameScan(
  opnameId: number,
  assetId: number,
  status: 'Ditemukan' | 'Hilang' | 'Nyasar',
  notes?: string
): Promise<StockOpnameDetail> {
  const { data, error } = await supabase
    .from('stock_opname_details')
    .insert({ opname_id: opnameId, asset_id: assetId, status, notes: notes ?? null })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Tutup sesi opname (set end_date).
 * TIDAK mengubah status aset — harus melalui reconciliation workflow.
 */
export async function closeOpnameSession(opnameId: number): Promise<void> {
  const { error } = await supabase
    .from('stock_opname')
    .update({ end_date: new Date().toISOString() })
    .eq('id', opnameId);

  if (error) throw new Error(error.message);
}

// ── Reconciliation Workflow ───────────────────────────────────────────────────

/**
 * Buat Draft Rekonsiliasi dari hasil sesi opname yang sudah selesai.
 *
 * Flow:
 * 1. Baca semua detail opname (Ditemukan / Hilang / Nyasar).
 * 2. Hitung variance summary.
 * 3. Buat header stock_reconciliations (status: Draft, doc_status: 0).
 * 4. Buat detail stock_reconciliation_items dengan proposed_action default.
 * 5. TIDAK mengubah status aset.
 */
export async function createReconciliationDraft(
  opnameId: number,
  siteAlias: string,
  submittedBy: number
): Promise<StockReconciliation> {
  // Cek apakah sudah ada rekonsiliasi untuk opname ini
  const { data: existingRecon } = await supabase
    .from('stock_reconciliations')
    .select('id, reconciliation_code, status')
    .eq('opname_id', opnameId)
    .maybeSingle();

  if (existingRecon) {
    // Kembalikan yang sudah ada
    return existingRecon as StockReconciliation;
  }

  // Ambil semua detail opname
  const { data: details, error: detailErr } = await supabase
    .from('stock_opname_details')
    .select('id, asset_id, status, notes')
    .eq('opname_id', opnameId);

  if (detailErr) throw new Error(detailErr.message);
  if (!details || details.length === 0) {
    throw new Error('Sesi opname ini belum memiliki data scan. Tidak dapat membuat rekonsiliasi.');
  }

  // Hitung variance
  const varianceSummary = {
    found:     details.filter((d: any) => d.status === 'Ditemukan').length,
    missing:   details.filter((d: any) => d.status === 'Hilang').length,
    misplaced: details.filter((d: any) => d.status === 'Nyasar').length,
  };

  // Buat header rekonsiliasi
  const reconCode = generateReconciliationCode(siteAlias);
  const { data: recon, error: reconErr } = await supabase
    .from('stock_reconciliations')
    .insert({
      reconciliation_code: reconCode,
      opname_id: opnameId,
      status: 'Draft',
      doc_status: 0,
      submitted_by: submittedBy,
      variance_summary: varianceSummary,
    })
    .select()
    .single();

  if (reconErr) throw new Error(reconErr.message);

  // Buat detail items dengan proposed_action default
  const items = details.map((d: any) => {
    let proposedAction: ProposedActionType = 'NO_ACTION';
    if (d.status === 'Hilang') proposedAction = 'MARK_MISSING';
    if (d.status === 'Nyasar') proposedAction = 'CORRECT_LOCATION';

    return {
      reconciliation_id: recon.id,
      asset_id: d.asset_id,
      opname_status: d.status,
      proposed_action: proposedAction,
      notes: d.notes ?? null,
    };
  });

  const { error: itemsErr } = await supabase
    .from('stock_reconciliation_items')
    .insert(items);

  if (itemsErr) throw new Error(itemsErr.message);

  return recon as StockReconciliation;
}

/**
 * Submit rekonsiliasi ke Super Admin untuk approval.
 * Setelah submit, doc_status = 1 (Locked) — tidak bisa diedit lagi.
 */
export async function submitReconciliation(
  reconciliationId: number,
  userId: number
): Promise<void> {
  const { error } = await supabase
    .from('stock_reconciliations')
    .update({
      status: 'Submitted',
      doc_status: 1,           // Kunci dokumen
      submitted_by: userId,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reconciliationId)
    .eq('doc_status', 0);     // Hanya bisa submit jika masih Draft

  if (error) throw new Error(error.message);
}

/**
 * Ambil semua rekonsiliasi (untuk list di UI).
 */
export async function getReconciliations(status?: StockReconciliation['status']): Promise<StockReconciliation[]> {
  let q = supabase
    .from('stock_reconciliations')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Ambil detail items dari satu rekonsiliasi.
 */
export async function getReconciliationItems(
  reconciliationId: number
): Promise<StockReconciliationItem[]> {
  const { data, error } = await supabase
    .from('stock_reconciliation_items')
    .select('*')
    .eq('reconciliation_id', reconciliationId);

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Super Admin: Approve rekonsiliasi dan terapkan aksi yang disetujui.
 *
 * Untuk setiap item:
 * - MARK_MISSING → catat di field_audit_trails (tidak ubah status aset langsung)
 * - CORRECT_LOCATION → update site_alias aset ke lokasi yang benar
 * - PROPOSE_DISPOSAL → panggil propose_asset_disposal RPC
 * - NO_ACTION → skip
 *
 * ATURAN: Opname tidak boleh mengubah status aset secara langsung.
 * Hanya CORRECT_LOCATION yang mengubah field site_alias.
 */
export async function approveReconciliation(
  reconciliationId: number,
  approvedBy: number,
  itemActions: Array<{
    itemId: number;
    approvedAction: ProposedActionType;
    correctSiteAlias?: string; // Untuk CORRECT_LOCATION
    disposalReason?: string;   // Untuk PROPOSE_DISPOSAL
    notes?: string;
  }>
): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;

  for (const action of itemActions) {
    try {
      // Update approved_action di item
      await supabase
        .from('stock_reconciliation_items')
        .update({ approved_action: action.approvedAction, notes: action.notes ?? null })
        .eq('id', action.itemId);

      if (action.approvedAction === 'CORRECT_LOCATION' && action.correctSiteAlias) {
        // Ambil asset_id dari item
        const { data: item } = await supabase
          .from('stock_reconciliation_items')
          .select('asset_id')
          .eq('id', action.itemId)
          .single();

        if (item?.asset_id) {
          await supabase
            .from('master_assets')
            .update({ site_alias: action.correctSiteAlias, updated_at: new Date().toISOString() })
            .eq('id', item.asset_id);
        }
      }

      if (action.approvedAction === 'PROPOSE_DISPOSAL') {
        const { data: item } = await supabase
          .from('stock_reconciliation_items')
          .select('asset_id')
          .eq('id', action.itemId)
          .single();

        if (item?.asset_id) {
          await supabase.rpc('propose_asset_disposal', {
            p_asset_id: item.asset_id,
            p_reason_category: action.disposalReason ?? 'Ditemukan Rusak saat Opname',
            p_proposed_by: approvedBy,
            p_source: 'OPNAME',
          });
        }
      }

      processed++;
    } catch (err: any) {
      errors.push(`Item #${action.itemId}: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Approval selesai sebagian. Gagal memproses ${errors.length} item:\n${errors.join('\n')}`);
  }

  // Finalisasi rekonsiliasi jika semua berhasil
  await supabase
    .from('stock_reconciliations')
    .update({
      status: 'Approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reconciliationId);

  return { processed, errors };
}

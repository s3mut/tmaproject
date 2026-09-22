// ============================================================
// Types selaras dengan sql/upgrade_erp_standards.sql (Enterprise-Grade Upgrade)
// ============================================================

// ----- ENUMs -----
export type AssetStatus = 'Active' | 'Backup' | 'Disposed' | 'Retired' | 'PENDING_DISPOSAL';
export type UserRole = 'admin' | 'user' | 'guest';
export type TransactionType = 'Mutation' | 'Borrowing' | 'Repair';
export type TransactionStatus = 'Requested' | 'Approved' | 'In Transit' | 'In Progress' | 'Returning' | 'Completed' | 'Rejected' | 'Cancelled';
export type TransactionSubtype = 'MaterialRequest' | 'DeliveryNote' | 'PartialFulfillment' | null;
export type OpnameStatus = 'Ditemukan' | 'Hilang' | 'Nyasar';
export type ReconciliationStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
export type ProposedActionType = 'MARK_MISSING' | 'CORRECT_LOCATION' | 'PROPOSE_DISPOSAL' | 'NO_ACTION';

/** DocStatus mengikuti standar ERPNext: 0=Draft, 1=Submitted/Locked, 2=Cancelled */
export type DocStatus = 0 | 1 | 2;

/** Konstanta EVENT_TYPE untuk asset_movement_logs */
export const MOVEMENT_EVENT_TYPES = {
  MUTATION_COMPLETE:       'MUTATION_COMPLETE',
  LOAN_DISPATCH:           'LOAN_DISPATCH',
  LOAN_RETURN:             'LOAN_RETURN',
  LOAN_COMPLETE:           'LOAN_COMPLETE',
  DISPOSAL_PROPOSED:       'DISPOSAL_PROPOSED',
  DISPOSAL_APPROVED:       'DISPOSAL_APPROVED',
  OPNAME_SCAN:             'OPNAME_SCAN',
  RECONCILIATION_APPLIED:  'RECONCILIATION_APPLIED',
  LOCATION_CORRECTION:     'LOCATION_CORRECTION',
  STATUS_CHANGE:           'STATUS_CHANGE',
  TRANSACTION_COMPLETE:    'TRANSACTION_COMPLETE',
} as const;
export type MovementEventType = typeof MOVEMENT_EVENT_TYPES[keyof typeof MOVEMENT_EVENT_TYPES];

// ----- TABLE: sites -----
export interface Site {
  site_code: string;       // PK VARCHAR(4)
  site_name: string;
  site_alias: string | null;
  region: string | null;
  site_address: string | null;
  created_at: string;
}

// ----- TABLE: master_categories -----
export interface Category {
  id: number;
  name: string;
  icon: string;
  color_text: string;
  color_bg: string;
  created_at: string;
}

// ----- TABLE: telegram_users -----
export interface TelegramUser {
  telegram_id: number;     // BIGINT PK
  name: string;
  username: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  role?: UserRole | string;
  assigned_region?: string | null;
  has_web_access?: boolean;
}

export interface UpsertUserData {
  telegram_id: number;
  name: string;
  username?: string | null;
  role: UserRole;
  assigned_region?: string | null;
  is_active?: boolean;
  has_web_access?: boolean;
  web_password?: string | null;
  notes?: string | null;
}

// ----- TABLE: master_assets -----
export interface MasterAsset {
  id: number;              // BIGSERIAL PK
  serial_number: string;
  aktiva: string | null;   // Nama aktiva / nomor BTA
  category_id: number;     // FK → master_categories.id
  brand: string | null;
  model_type: string | null;
  computer_name: string | null;
  site_alias: string | null; // FK → sites.site_alias
  status: AssetStatus;
  external_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ----- TABLE: asset_transactions -----
export interface AssetTransaction {
  id: number;              // BIGSERIAL PK
  transaction_code: string;
  transaction_type: TransactionType;
  status: TransactionStatus;
  /** ERPNext-style DocStatus: 0=Draft, 1=Submitted/Locked, 2=Cancelled */
  doc_status?: DocStatus;
  transaction_subtype?: TransactionSubtype;
  parent_transaction_id?: number | null;

  asset_id: number | null;
  category_id: number | null;

  from_site_code: string | null;
  to_site_code: string | null;

  requested_by: number;
  approved_by: number | null;
  dispatched_by: number | null;
  received_by: number | null;

  purpose: string | null;
  shipping_method: string | null;
  tracking_number: string | null;
  notes: string | null;

  requested_at: string;
  approved_at: string | null;
  dispatched_at: string | null;
  received_at: string | null;
  completed_at: string | null;

  duration_days?: number | null;
  due_date?: string | null;
}

// ----- TABLE: asset_movement_logs (Immutable Stock Ledger) -----
export interface AssetMovementLog {
  id: number;
  logged_at: string;
  asset_id: number;
  serial_number: string;
  event_type: MovementEventType | string;
  document_code: string | null;
  from_site_code: string | null;
  to_site_code: string | null;
  executor_id: number | null;
  executor_name: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined fields (dari view_asset_timeline)
  from_site_name?: string | null;
  to_site_name?: string | null;
  executor_full_name?: string | null;
}

// ----- TABLE: disposal_proposals -----
export interface DisposalProposal {
  id: number;
  asset_id: number;
  serial_number: string;
  reason_category: string;
  reason_detail: string | null;
  photo_url: string | null;
  proposed_by: number;
  proposed_at: string;
  source: 'AD_HOC' | 'OPNAME';
  opname_id: number | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewed_by: number | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  // Joined fields (dari view_disposal_queue)
  proposed_by_name?: string;
  brand?: string | null;
  model_type?: string | null;
  computer_name?: string | null;
  site_alias?: string | null;
  asset_status?: AssetStatus;
  category_name?: string;
  category_icon?: string;
  category_color_text?: string;
  category_color_bg?: string;
  site_name?: string | null;
  region?: string | null;
}

// ----- TABLE: stock_reconciliations -----
export interface StockReconciliation {
  id: number;
  reconciliation_code: string;
  opname_id: number;
  status: ReconciliationStatus;
  doc_status: DocStatus;
  submitted_by: number | null;
  approved_by: number | null;
  submitted_at: string | null;
  approved_at: string | null;
  variance_summary: {
    found: number;
    missing: number;
    misplaced: number;
  };
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ----- TABLE: stock_reconciliation_items -----
export interface StockReconciliationItem {
  id: number;
  reconciliation_id: number;
  asset_id: number | null;
  serial_number: string | null;
  opname_status: OpnameStatus;
  proposed_action: ProposedActionType;
  approved_action: ProposedActionType | null;
  notes: string | null;
  created_at: string;
}

// ----- TABLE: stock_opname -----
export interface StockOpname {
  id: number;
  site_alias: string;
  conducted_by: number;
  start_date: string;
  end_date: string | null;
  notes: string | null;
}

// ----- TABLE: stock_opname_details -----
export interface StockOpnameDetail {
  id: number;
  opname_id: number;
  asset_id: number;
  status: OpnameStatus;
  scanned_at: string;
  notes: string | null;
}

// ----- VIEW: view_assets_detail -----
export interface AssetDetail extends MasterAsset {
  category_name: string;
  category_icon: string;
  category_color_text: string;
  category_color_bg: string;
  full_location_code: string | null;
  site_name: string | null;
  site_address: string | null;
  site_region?: string | null;
}

// ----- Transaction with joins (untuk tampilan history) -----
export interface TransactionDetail extends AssetTransaction {
  asset_serial_number?: string;
  asset_category_name?: string;
  asset_brand?: string | null;
  asset_model_type?: string | null;
  from_site_name?: string | null;
  to_site_name?: string | null;
  to_site_region?: string | null;
  requested_by_name: string;
  approved_by_name?: string | null;
  dispatched_by_name?: string | null;
  received_by_name?: string | null;
}

// ============================================================
// UI Config Maps
// ============================================================

export const assetStatusConfig: Record<AssetStatus, { label: string; className: string; icon: string }> = {
  Active:           { label: 'Active',           className: 'status-active',                                    icon: 'fa-check-circle'    },
  Backup:           { label: 'Backup',           className: 'status-backup',                                    icon: 'fa-archive'         },
  Disposed:         { label: 'Disposed',         className: 'text-red-400 bg-red-500/15',                       icon: 'fa-trash-alt'       },
  Retired:          { label: 'Retired',          className: 'text-slate-400 bg-slate-500/20',                   icon: 'fa-power-off'       },
  PENDING_DISPOSAL: { label: 'Pending Disposal', className: 'text-orange-300 bg-orange-500/20 border border-orange-500/40', icon: 'fa-hourglass-half' },
};

/** Daftar alasan baku untuk usulan afkir */
export const DISPOSAL_REASON_OPTIONS = [
  'Kerusakan Fisik Berat / Tidak Bisa Diperbaiki',
  'Usia Perangkat > 5 Tahun (Depresiasi Penuh)',
  'Komponen Tidak Tersedia di Pasaran',
  'Gagal Fungsi Total (Dead on Arrival)',
  'Digantikan Perangkat Baru (Obsolete)',
  'Hilang / Tidak Diketemukan',
  'Rusak Akibat Bencana / Force Majeure',
] as const;
export type DisposalReasonOption = typeof DISPOSAL_REASON_OPTIONS[number];

/**
 * Aset yang TIDAK BOLEH ditransaksikan (lock dari semua dropdown mutasi/pinjam).
 * Gunakan ini di komponen TransactionModal & BackupModal.
 */
export const LOCKED_ASSET_STATUSES: AssetStatus[] = ['PENDING_DISPOSAL', 'Disposed'];

// ============================================================
// ASSET TRANSACTIONS
// ============================================================

export const transactionStatusConfig: Record<TransactionStatus, { label: string; bg: string; text: string; icon: string }> = {
  Requested:    { label: 'Requested',   bg: 'bg-amber-500/20 border border-amber-500/40',   text: 'text-amber-300',   icon: 'fa-clock' },
  Approved:     { label: 'Approved',    bg: 'bg-teal-500/20 border border-teal-500/40',     text: 'text-teal-300',    icon: 'fa-check-circle' },
  'In Transit': { label: 'In Transit',  bg: 'bg-blue-500/20 border border-blue-500/40',     text: 'text-blue-300',    icon: 'fa-truck' },
  'In Progress':{ label: 'In Progress', bg: 'bg-emerald-500/20 border border-emerald-500/40', text: 'text-emerald-300', icon: 'fa-tools' },
  Returning:    { label: 'Returning',   bg: 'bg-purple-500/20 border border-purple-500/40', text: 'text-purple-300',  icon: 'fa-box-open' },
  Completed:    { label: 'Completed',   bg: 'bg-slate-700/50 border border-slate-600/50',   text: 'text-slate-400',   icon: 'fa-check-double' },
  Rejected:     { label: 'Rejected',    bg: 'bg-red-500/20 border border-red-500/40',       text: 'text-red-400',     icon: 'fa-times-circle' },
  Cancelled:    { label: 'Cancelled',   bg: 'bg-slate-700/30 border border-slate-600/40',   text: 'text-slate-400',   icon: 'fa-ban' },
};

// ============================================================
// SUPER ADMIN SETTINGS & TELEGRAM ROUTING
// ============================================================

export interface SystemSetting<T = any> {
  key: string;
  value: T;
  description?: string | null;
  updated_at?: string;
  updated_by?: number | null;
}

export interface TelegramGroupRoute {
  id: number;
  group_name: string;
  chat_id: string;
  region: string | null;
  events: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}


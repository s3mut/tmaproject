// ============================================================
// Types selaras dengan docs/schema.sql (Enterprise Upgrade)
// ============================================================

// ----- ENUMs -----
export type AssetStatus = 'Active' | 'Backup' | 'Repair' | 'Disposed' | 'In Transit' | 'Retired' | 'Borrowed';
export type UserRole = 'admin' | 'user' | 'guest';
export type MutationStatus = 'Pending' | 'Completed' | 'Rejected';
export type OpnameStatus = 'Ditemukan' | 'Hilang' | 'Nyasar';
export type LoanStatus = 'Requested' | 'Waiting Admin Approval' | 'Approved' | 'In-Transit' | 'Borrowed' | 'Return In-Transit' | 'Closed' | 'Rejected' | 'Cancelled';

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

// ----- TABLE: asset_mutations -----
export interface AssetMutation {
  id: number;              // BIGSERIAL PK
  asset_id: number;
  from_site_code: string | null;
  to_site_code: string;
  moved_by: number;        // telegram_id FK
  notes: string | null;
  status: MutationStatus;
  received_by: number | null;
  received_at: string | null;
  mutation_date: string;
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

// ----- Mutation with joins (untuk tampilan history) -----
export interface MutationDetail extends AssetMutation {
  asset_serial_number: string;
  asset_category_name: string;
  asset_brand: string | null;
  asset_model_type: string | null;
  from_site_name: string | null;
  to_site_name: string;
  moved_by_name: string;
  received_by_name: string | null;
}

// ============================================================
// UI Config Maps
// ============================================================

export const assetStatusConfig: Record<AssetStatus, { label: string; className: string; icon: string }> = {
  Active:       { label: 'Active',       className: 'status-active',       icon: 'fa-check-circle' },
  Backup:       { label: 'Backup',       className: 'status-backup',       icon: 'fa-archive' },
  Repair:       { label: 'Repair',       className: 'status-repair',       icon: 'fa-tools' },
  Disposed:     { label: 'Disposed',     className: 'text-red-600 bg-red-100', icon: 'fa-trash-alt' },
  'In Transit': { label: 'In Transit',   className: 'text-blue-600 bg-blue-100', icon: 'fa-truck' },
  Retired:      { label: 'Retired',      className: 'text-slate-500 bg-slate-200', icon: 'fa-power-off' },
  Borrowed:     { label: 'Borrowed',     className: 'text-purple-300 bg-purple-500/20 border border-purple-500/30', icon: 'fa-hand-holding-box' },
};

// ============================================================
// ASSET LOANS (Peminjaman & Unit Backup)
// ============================================================
export interface AssetLoan {
  id: number;
  loan_code: string;
  site_alias: string;
  category_name: string;
  purpose: string;
  duration_days: number;
  requires_it_approval: boolean;
  due_date: string;
  shipping_method: 'Pick-up' | 'Delivery' | string;
  tracking_number: string | null;
  asset_id: number | null;
  status: LoanStatus;
  condition_on_return: 'Bagus' | 'Rusak' | 'Hilang' | string | null;
  requested_by_id: number;
  requested_by_name: string;
  dispatched_by_name: string | null;
  received_by_name: string | null;
  created_at: string;
  dispatched_at: string | null;
  received_at: string | null;
  returned_at: string | null;
  closed_at: string | null;
  notes: string | null;
  // RBAC & State Machine Workflow
  is_cross_region?: boolean;
  target_source_region?: string | null;
  approved_by_id?: number | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  cancelled_by_id?: number | null;
  cancelled_by_role?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  force_cancelled_at?: string | null;
  // Joined / Rich fields
  asset_serial_number?: string;
  asset_brand?: string | null;
  asset_model_type?: string | null;
  site_name?: string;
  site_region?: string | null;
}

export const loanStatusConfig: Record<LoanStatus, { label: string; bg: string; text: string; icon: string }> = {
  Requested:              { label: 'Request Baru',        bg: 'bg-amber-500/20 border border-amber-500/40',   text: 'text-amber-300',   icon: 'fa-clock' },
  'Waiting Admin Approval': { label: 'Eskalasi Cross-Region', bg: 'bg-indigo-500/20 border border-indigo-500/40', text: 'text-indigo-300',  icon: 'fa-user-shield' },
  Approved:               { label: 'Siap Alokasi',        bg: 'bg-teal-500/20 border border-teal-500/40',     text: 'text-teal-300',    icon: 'fa-check-circle' },
  'In-Transit':           { label: 'Dalam Pengiriman',    bg: 'bg-blue-500/20 border border-blue-500/40',     text: 'text-blue-300',    icon: 'fa-truck' },
  Borrowed:               { label: 'Aktif Dipinjam',      bg: 'bg-emerald-500/20 border border-emerald-500/40', text: 'text-emerald-300', icon: 'fa-box-open' },
  'Return In-Transit':    { label: 'Proses Kembali',      bg: 'bg-purple-500/20 border border-purple-500/40',   text: 'text-purple-300',  icon: 'fa-reply' },
  Closed:                 { label: 'Selesai (Closed)',    bg: 'bg-slate-700/50 border border-slate-600/50',   text: 'text-slate-400',   icon: 'fa-check-double' },
  Rejected:               { label: 'Ditolak',             bg: 'bg-red-500/20 border border-red-500/40',       text: 'text-red-400',     icon: 'fa-times-circle' },
  Cancelled:              { label: 'Dibatalkan',          bg: 'bg-slate-700/30 border border-slate-600/40',   text: 'text-slate-400',   icon: 'fa-ban' },
};

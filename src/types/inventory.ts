// ============================================================
// Types selaras dengan docs/schema.sql (Enterprise Upgrade)
// ============================================================

// ----- ENUMs -----
export type AssetStatus = 'Active' | 'Backup' | 'Disposed' | 'Retired';
export type UserRole = 'admin' | 'user' | 'guest';
export type TransactionType = 'Mutation' | 'Borrowing' | 'Repair';
export type TransactionStatus = 'Requested' | 'Approved' | 'In Transit' | 'In Progress' | 'Completed' | 'Rejected' | 'Cancelled';
export type OpnameStatus = 'Ditemukan' | 'Hilang' | 'Nyasar';

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

// ----- TABLE: asset_transactions -----
export interface AssetTransaction {
  id: number;              // BIGSERIAL PK
  transaction_code: string;
  transaction_type: TransactionType;
  status: TransactionStatus;
  
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
  requested_by_name: string;
  approved_by_name?: string | null;
  dispatched_by_name?: string | null;
  received_by_name?: string | null;
}

// ============================================================
// UI Config Maps
// ============================================================

export const assetStatusConfig: Record<AssetStatus, { label: string; className: string; icon: string }> = {
  Active:       { label: 'Active',       className: 'status-active',       icon: 'fa-check-circle' },
  Backup:       { label: 'Backup',       className: 'status-backup',       icon: 'fa-archive' },
  Disposed:     { label: 'Disposed',     className: 'text-red-600 bg-red-100', icon: 'fa-trash-alt' },
  Retired:      { label: 'Retired',      className: 'text-slate-500 bg-slate-200', icon: 'fa-power-off' },
};

// ============================================================
// ASSET TRANSACTIONS
// ============================================================

export const transactionStatusConfig: Record<TransactionStatus, { label: string; bg: string; text: string; icon: string }> = {
  Requested:    { label: 'Requested',   bg: 'bg-amber-500/20 border border-amber-500/40',   text: 'text-amber-300',   icon: 'fa-clock' },
  Approved:     { label: 'Approved',    bg: 'bg-teal-500/20 border border-teal-500/40',     text: 'text-teal-300',    icon: 'fa-check-circle' },
  'In Transit': { label: 'In Transit',  bg: 'bg-blue-500/20 border border-blue-500/40',     text: 'text-blue-300',    icon: 'fa-truck' },
  'In Progress':{ label: 'In Progress', bg: 'bg-emerald-500/20 border border-emerald-500/40', text: 'text-emerald-300', icon: 'fa-tools' },
  Completed:    { label: 'Completed',   bg: 'bg-slate-700/50 border border-slate-600/50',   text: 'text-slate-400',   icon: 'fa-check-double' },
  Rejected:     { label: 'Rejected',    bg: 'bg-red-500/20 border border-red-500/40',       text: 'text-red-400',     icon: 'fa-times-circle' },
  Cancelled:    { label: 'Cancelled',   bg: 'bg-slate-700/30 border border-slate-600/40',   text: 'text-slate-400',   icon: 'fa-ban' },
};

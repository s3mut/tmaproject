// ============================================================
// Types selaras dengan docs/schema.sql (Enterprise Upgrade)
// ============================================================

// ----- ENUMs -----
export type AssetStatus = 'Active' | 'Backup' | 'Broken' | 'Repair' | 'Disposed' | 'In Transit' | 'Retired';
export type UserRole = 'admin' | 'user' | 'guest';
export type MutationStatus = 'Pending' | 'Completed' | 'Rejected';
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
  role: UserRole;
  is_active: boolean;
  notes: string | null;
  created_at: string;
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
  Broken:       { label: 'Broken',       className: 'status-broken',       icon: 'fa-times-circle' },
  Repair:       { label: 'Repair',       className: 'status-repair',       icon: 'fa-tools' },
  Disposed:     { label: 'Disposed',     className: 'text-red-600 bg-red-100', icon: 'fa-trash-alt' },
  'In Transit': { label: 'In Transit',   className: 'text-blue-600 bg-blue-100', icon: 'fa-truck' },
  Retired:      { label: 'Retired',      className: 'text-slate-500 bg-slate-200', icon: 'fa-power-off' },
};

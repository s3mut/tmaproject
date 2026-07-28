// ============================================================
// Types selaras dengan docs/schema.sql
// ============================================================

// ----- ENUMs -----
export type AssetStatus = 'Active' | 'Backup' | 'Broken' | 'Repair';
export type UserRole = 'admin' | 'user' | 'guest';

// ----- TABLE: sites -----
export interface Site {
  site_code: string;       // PK VARCHAR(4)
  site_name: string;
  site_alias: string | null;
  region: string | null;
  site_address: string | null;
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
  category: string;
  brand: string | null;
  model_type: string | null;
  computer_name: string | null;
  site_alias: string | null; // FK → sites.site_alias
  status: AssetStatus;
  external_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// ----- TABLE: asset_mutations -----
export interface AssetMutation {
  id: number;              // BIGSERIAL PK
  asset_id: number;
  from_site_code: string | null;
  to_site_code: string;
  moved_by: number;        // telegram_id FK
  notes: string | null;
  mutation_date: string;
}

// ----- VIEW: view_assets_detail -----
export interface AssetDetail extends MasterAsset {
  full_location_code: string | null;
  site_name: string | null;
  site_address: string | null;
}

// ----- Mutation with joins (untuk tampilan history) -----
export interface MutationDetail extends AssetMutation {
  asset_serial_number: string;
  asset_category: string;
  asset_brand: string | null;
  asset_model_type: string | null;
  from_site_name: string | null;
  to_site_name: string;
  moved_by_name: string;
}

// ============================================================
// UI Config Maps
// ============================================================

export const assetStatusConfig: Record<AssetStatus, { label: string; className: string; icon: string }> = {
  Active:  { label: 'Active',  className: 'status-active',  icon: 'fa-check-circle' },
  Backup:  { label: 'Backup',  className: 'status-backup',  icon: 'fa-archive' },
  Broken:  { label: 'Broken',  className: 'status-broken',  icon: 'fa-times-circle' },
  Repair:  { label: 'Repair',  className: 'status-repair',  icon: 'fa-tools' },
};

export const categoryConfig: Record<string, { icon: string; color: string; bg: string }> = {
  Laptop:      { icon: 'fa-laptop',   color: 'text-purple-400', bg: 'bg-purple-500/20' },
  Monitor:     { icon: 'fa-desktop',  color: 'text-cyan-400',   bg: 'bg-cyan-500/20' },
  Printer:     { icon: 'fa-print',    color: 'text-orange-400', bg: 'bg-orange-500/20' },
  Network:     { icon: 'fa-wifi',     color: 'text-emerald-400',bg: 'bg-emerald-500/20' },
  Accessories: { icon: 'fa-keyboard', color: 'text-pink-400',   bg: 'bg-pink-500/20' },
  Server:      { icon: 'fa-server',   color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
  Storage:     { icon: 'fa-hdd',      color: 'text-teal-400',   bg: 'bg-teal-500/20' },
  default:     { icon: 'fa-box',      color: 'text-slate-400',  bg: 'bg-slate-500/20' },
};

export function getCategoryConfig(category: string) {
  return categoryConfig[category] ?? categoryConfig['default'];
}

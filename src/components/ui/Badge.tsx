import { assetStatusConfig } from '../../types/inventory';
import type { AssetStatus } from '../../types/inventory';

type MutationStatus = 'Pending' | 'Completed' | 'Rejected';

// ── Asset Status Badge ────────────────────────────────────────────────────────
interface AssetBadgeProps {
  status: AssetStatus;
  size?: 'sm' | 'md';
}

/**
 * Design System — Badge (Asset Status)
 * Replaces StatusBadge.tsx — renders coloured pill for asset status.
 */
export const AssetBadge = ({ status, size = 'md' }: AssetBadgeProps) => {
  const cfg = assetStatusConfig[status] ?? assetStatusConfig['Active'];
  return (
    <span
      className={`status-badge ${cfg.className} flex-shrink-0 ${
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : ''
      }`}
    >
      <i className={`fas ${cfg.icon} text-xs`} />
      {cfg.label}
    </span>
  );
};

// ── Mutation Status Badge ─────────────────────────────────────────────────────
const mutationConfig: Record<MutationStatus, { cls: string; label: string }> = {
  Pending:   { cls: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',   label: 'Pending'   },
  Completed: { cls: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', label: 'Selesai' },
  Rejected:  { cls: 'bg-red-500/20 text-red-400 border border-red-500/30',         label: 'Ditolak'   },
};

interface MutationBadgeProps {
  status: MutationStatus | string;
}

export const MutationBadge = ({ status }: MutationBadgeProps) => {
  const cfg = mutationConfig[status as MutationStatus] ?? mutationConfig['Pending'];
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

// ── Generic Role Badge ────────────────────────────────────────────────────────
const roleConfig: Record<string, string> = {
  admin:   'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  maker:   'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  checker: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  guest:   'bg-slate-700/80 text-slate-400 border border-slate-600/30',
};

interface RoleBadgeProps { role: string; }

export const RoleBadge = ({ role }: RoleBadgeProps) => {
  const cls = roleConfig[role.toLowerCase()] ?? roleConfig['guest'];
  return (
    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wide ${cls}`}>
      {role}
    </span>
  );
};

// ── Default export — backward compat with StatusBadge.tsx ─────────────────────
export default AssetBadge;

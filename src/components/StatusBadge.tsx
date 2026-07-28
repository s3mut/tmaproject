import { assetStatusConfig } from '../types/inventory';
import type { AssetStatus } from '../types/inventory';

interface Props {
  status: AssetStatus;
}

const StatusBadge = ({ status }: Props) => {
  // Guard: fallback ke 'Active' jika status tidak valid (e.g., VIEW Supabase return null)
  const cfg = assetStatusConfig[status] ?? assetStatusConfig['Active'];
  return (
    <span className={`status-badge ${cfg.className} flex-shrink-0`}>
      <i className={`fas ${cfg.icon} text-xs`}></i>
      {cfg.label}
    </span>
  );
};

export default StatusBadge;

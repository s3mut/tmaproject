import { assetStatusConfig } from '../types/inventory';
import type { AssetStatus } from '../types/inventory';

interface Props {
  status: AssetStatus;
}

const StatusBadge = ({ status }: Props) => {
  const cfg = assetStatusConfig[status];
  return (
    <span className={`status-badge ${cfg.className} flex-shrink-0`}>
      <i className={`fas ${cfg.icon} text-xs`}></i>
      {cfg.label}
    </span>
  );
};

export default StatusBadge;

import type { AssetDetail } from '../types/inventory';
import StatusBadge from './StatusBadge';

interface Props {
  item: AssetDetail;
  isLocked?: boolean;
  onClick: (id: number) => void;
}

const ItemCard = ({ item, isLocked, onClick }: Props) => {
  return (
    <div
      className={`item-card rounded-xl p-4 cursor-pointer transition-all ${isLocked ? 'opacity-80 border-amber-500/30' : 'card-hover'}`}
      onClick={() => onClick(item.id)}
    >
      <div className="flex items-start gap-3">
        <div className={`category-icon ${item.category_color_bg} ${item.category_color_text} flex-shrink-0`}>
          <i className={`fas ${item.category_icon}`}></i>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate flex items-center gap-2">
                {item.brand} {item.model_type ?? item.serial_number}
                {isLocked && <i className="fas fa-lock text-amber-500 text-xs" title="Sedang diproses"></i>}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{item.serial_number}</p>
            </div>
            <StatusBadge status={item.status} />
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
            <span>
              <i className="fas fa-map-marker-alt mr-1"></i>
              {item.site_name ?? item.full_location_code ?? 'No site'}
            </span>
            {item.computer_name && (
              <span>
                <i className="fas fa-desktop mr-1"></i>
                {item.computer_name}
              </span>
            )}
            <span className="text-slate-600 dark:text-slate-400">{item.category_name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemCard;

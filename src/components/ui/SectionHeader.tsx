import type { ReactNode } from 'react';
import Button from './Button';

interface Action {
  label:    string;
  icon?:    string;
  iconRight?: string;
  onClick:  () => void;
  variant?: 'ghost' | 'primary' | 'secondary';
  className?: string;
}

interface Props {
  title:       string;
  icon?:       string;
  iconColor?:  string;  // tailwind text color class
  action?:     Action;
  className?:  string;
  children?:   ReactNode;
}

/**
 * Design System — SectionHeader
 * Consistent section title row with optional right-side action button.
 *
 * Usage:
 *   <SectionHeader title="Kategori Aset" icon="fa-layer-group"
 *     action={{ label: 'Reset Filter', icon: 'fa-undo', onClick: handleReset }} />
 */
const SectionHeader = ({ title, icon, iconColor = 'text-blue-600 dark:text-blue-400', action, className = '', children }: Props) => (
  <div className={`flex items-center justify-between mb-3 ${className}`}>
    <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
      {icon && <i className={`fas ${icon} ${iconColor}`} />}
      {title}
    </h2>
    <div className="flex items-center gap-2">
      {children}
      {action && (
        <Button
          variant={action.variant ?? 'ghost'}
          size="sm"
          icon={action.icon}
          iconRight={action.iconRight}
          onClick={action.onClick}
          className={action.className}
        >
          {action.label}
        </Button>
      )}
    </div>
  </div>
);

export default SectionHeader;

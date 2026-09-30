interface Props {
  icon?:        string;   // FontAwesome class
  iconColor?:   string;   // tailwind text color class
  iconBg?:      string;   // tailwind bg color class
  title:        string;
  description?: string;
  className?:   string;
}

/**
 * Design System — EmptyState
 * Standardized empty-list/no-data placeholder with icon, title, and description.
 *
 * Usage:
 *   <EmptyState icon="fa-exchange-alt" title="Belum ada mutasi" description="Mutasi akan muncul di sini." />
 */
const EmptyState = ({
  icon = 'fa-inbox',
  iconColor = 'text-slate-500 dark:text-slate-600',
  iconBg = 'bg-slate-100/30 dark:bg-slate-800/50',
  title,
  description,
  className = '',
}: Props) => (
  <div className={`text-center py-10 glass rounded-2xl border border-slate-200/50 dark:border-slate-800/60 ${className}`}>
    <div className={`w-14 h-14 ${iconBg} ${iconColor} rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl`}>
      <i className={`fas ${icon}`} />
    </div>
    <p className="text-slate-600 dark:text-slate-400 text-sm font-semibold">{title}</p>
    {description && (
      <p className="text-slate-500 dark:text-slate-600 text-xs mt-1.5 max-w-[200px] mx-auto leading-relaxed">{description}</p>
    )}
  </div>
);

export default EmptyState;

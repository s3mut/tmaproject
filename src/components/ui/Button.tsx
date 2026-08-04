import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost';
export type ButtonSize    = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant;
  size?:     ButtonSize;
  loading?:  boolean;
  icon?:     string;        // FontAwesome class, e.g. 'fa-save'
  iconRight?: string;
  fullWidth?: boolean;
  children?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:   'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25 border border-blue-500/30',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white border border-slate-600/50',
  danger:    'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-500/25 border border-red-500/30',
  success:   'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/25 border border-emerald-500/30',
  warning:   'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 shadow-lg shadow-yellow-500/25 border border-yellow-400/30',
  ghost:     'bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-700/50',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-5 py-3.5 text-sm rounded-xl gap-2 font-bold',
};

/**
 * Design System — Button
 * Reusable button with variant, size, loading state, and icon support.
 */
const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...rest
}: Props) => {
  const isDisabled = disabled || loading;

  return (
    <button
      {...rest}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center font-semibold transition-all duration-200 select-none',
        'active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {loading ? (
        <i className="fas fa-spinner fa-spin" />
      ) : icon ? (
        <i className={`fas ${icon}`} />
      ) : null}
      {children}
      {!loading && iconRight && <i className={`fas ${iconRight}`} />}
    </button>
  );
};

export default Button;

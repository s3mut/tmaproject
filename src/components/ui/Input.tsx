import { type InputHTMLAttributes, type ReactNode, useState, useId } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?:    string;
  icon?:     string;   // FontAwesome left icon
  error?:    string;
  hint?:     string;
  required?: boolean;
  children?: ReactNode; // right-side slot (e.g. show/hide button)
}

/**
 * Design System — Input
 * Consistent text input with label, icon, focus ring, and error state.
 */
const Input = ({
  label,
  icon,
  error,
  hint,
  required,
  children,
  id: propId,
  className = '',
  ...rest
}: Props) => {
  const autoId  = useId();
  const inputId = propId ?? autoId;
  const [focused, setFocused] = useState(false);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide uppercase"
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-sm transition-colors duration-200 pointer-events-none ${
              focused ? 'text-blue-400' : 'text-slate-500'
            }`}
          >
            <i className={`fas ${icon}`} />
          </div>
        )}
        <input autoComplete="off" data-lpignore="true"
          {...rest}
          id={inputId}
          required={required}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e)  => { setFocused(false); rest.onBlur?.(e); }}
          className={[
            'w-full bg-slate-900/70 border text-slate-100 text-sm rounded-xl transition-all duration-200 outline-none',
            'placeholder:text-slate-600',
            icon    ? 'pl-10'  : 'pl-4',
            children ? 'pr-10' : 'pr-4',
            'py-3',
            focused
              ? 'border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-slate-900/90'
              : error
              ? 'border-red-500/60 shadow-[0_0_0_3px_rgba(239,68,68,0.08)]'
              : 'border-slate-700/60 hover:border-slate-600',
            className,
          ].filter(Boolean).join(' ')}
        />
        {children && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {children}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
          <i className="fas fa-circle-exclamation text-[10px]" />{error}
        </p>
      )}
      {hint && !error && (
        <p className="mt-1 text-[10px] text-slate-500">{hint}</p>
      )}
    </div>
  );
};

export default Input;


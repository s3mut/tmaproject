import { type SelectHTMLAttributes, useState, useId } from 'react';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?:    string;
  error?:    string;
  hint?:     string;
  required?: boolean;
}

/**
 * Design System — Select
 * Consistent <select> dropdown with label, focus ring, and error state.
 */
const Select = ({
  label,
  error,
  hint,
  required,
  id: propId,
  className = '',
  children,
  ...rest
}: Props) => {
  const autoId   = useId();
  const selectId = propId ?? autoId;
  const [focused, setFocused] = useState(false);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide uppercase"
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          {...rest}
          id={selectId}
          required={required}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e)  => { setFocused(false); rest.onBlur?.(e); }}
          className={[
            'w-full bg-slate-900/70 border text-slate-100 text-sm rounded-xl px-4 py-3 transition-all duration-200 outline-none appearance-none cursor-pointer',
            focused
              ? 'border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-slate-900/90'
              : error
              ? 'border-red-500/60'
              : 'border-slate-700/60 hover:border-slate-600',
            className,
          ].filter(Boolean).join(' ')}
        >
          {children}
        </select>
        {/* Chevron icon */}
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
          <i className="fas fa-chevron-down text-xs" />
        </div>
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

export default Select;

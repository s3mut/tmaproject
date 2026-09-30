import { type TextareaHTMLAttributes, useState, useId } from 'react';

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?:    string;
  error?:    string;
  hint?:     string;
  required?: boolean;
}

/**
 * Design System — Textarea
 * Consistent <textarea> with label, focus ring, and error state.
 */
const Textarea = ({
  label,
  error,
  hint,
  required,
  id: propId,
  className = '',
  rows = 3,
  ...rest
}: Props) => {
  const autoId = useId();
  const areaId = propId ?? autoId;
  const [focused, setFocused] = useState(false);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={areaId}
          className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide uppercase"
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <textarea
        {...rest}
        id={areaId}
        rows={rows}
        required={required}
        onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={(e)  => { setFocused(false); rest.onBlur?.(e); }}
        className={[
          'w-full bg-white/70 dark:bg-slate-900/70 border text-slate-900 dark:text-slate-100 text-sm rounded-xl px-4 py-3 resize-none transition-all duration-200 outline-none',
          'placeholder:text-slate-500 dark:placeholder:text-slate-400',
          focused
            ? 'border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-white/90 dark:bg-slate-900/90'
            : error
            ? 'border-red-500/60'
            : 'border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600',
          className,
        ].filter(Boolean).join(' ')}
      />
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

export default Textarea;

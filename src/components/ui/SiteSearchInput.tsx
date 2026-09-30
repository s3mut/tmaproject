import { useId, useMemo } from 'react';
import type { Site } from '../../types/inventory';
import Input from './Input';

interface Props {
  sites:           Site[];
  value:           string;
  onChange:        (value: string, matchedSite: Site | null) => void;
  label?:          string;
  placeholder?:    string;
  required?:       boolean;
  disabled?:       boolean;
  error?:          string;
  hint?:           string;
  icon?:           string;
  customInfoText?: (val: string) => string;
}

/**
 * Design System — SiteSearchInput
 * Reusable auto-complete search input for selecting Sites by Alias or Code.
 * Replaces heavy <select> dropdowns to handle thousands of sites efficiently.
 */
const SiteSearchInput = ({
  sites,
  value,
  onChange,
  label = 'Lokasi Cabang (Site Alias)',
  placeholder = 'Ketik kode atau alias site...',
  required = false,
  disabled = false,
  error,
  hint,
  icon = 'fa-map-marker-alt',
  customInfoText,
}: Props) => {
  const reactId = useId();
  const datalistId = `site-list-${reactId}`;

  const matchedSite = useMemo(() => {
    if (!value || !value.trim()) return null;
    const query = value.trim().toLowerCase();
    return (
      sites.find(s => s.site_alias?.toLowerCase() === query) ||
      sites.find(s => s.site_code?.toLowerCase() === query) ||
      sites.find(s => s.site_name?.toLowerCase() === query) ||
      null
    );
  }, [sites, value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    let currentMatch: Site | null = null;
    if (val.trim()) {
      const query = val.trim().toLowerCase();
      currentMatch = sites.find(s => s.site_alias?.toLowerCase() === query) ||
                     sites.find(s => s.site_code?.toLowerCase() === query) ||
                     sites.find(s => s.site_name?.toLowerCase() === query) ||
                     null;
    }
    onChange(val, currentMatch);
  };

  return (
    <div className="w-full">
      <Input
        label={label}
        type="text"
        list={datalistId}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        error={error}
        hint={hint}
        icon={icon}
        className="uppercase"
        autoComplete="off"
      />
      
      <datalist id={datalistId}>
        {sites.map((s) => {
          const val = s.site_alias ?? s.site_code;
          return (
            <option key={s.site_code} value={val}>
              {val} — {s.site_name} {s.region ? `(${s.region})` : ''}
            </option>
          );
        })}
      </datalist>

      {/* Real-time feedback badge */}
      {matchedSite ? (
        <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1.5 font-medium animate-fadeIn">
          <i className="fas fa-check-circle text-emerald-400 text-[11px]" />
          <span>
            Site terdeteksi: <b>{matchedSite.site_name}</b> {matchedSite.region ? `[Region: ${matchedSite.region}]` : ''}
          </span>
        </p>
      ) : value && value.trim() !== '' ? (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <i className="fas fa-info-circle text-blue-600 dark:text-blue-400 text-[11px]" />
          <span>
            {customInfoText ? customInfoText(value) : `Alias / Kode lokasi: ${value.toUpperCase()}`}
          </span>
        </p>
      ) : null}
    </div>
  );
};

export default SiteSearchInput;

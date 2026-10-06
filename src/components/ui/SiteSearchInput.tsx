import { useMemo, useState, useRef, useEffect } from 'react';
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
 * Uses a custom dropdown to replace native <datalist> for better UX and consistency.
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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const filteredSites = useMemo(() => {
    if (!value || !value.trim()) return sites.slice(0, 10);
    const query = value.trim().toLowerCase();
    return sites.filter(s => 
      (s.site_alias?.toLowerCase().includes(query)) ||
      (s.site_code?.toLowerCase().includes(query)) ||
      (s.site_name?.toLowerCase().includes(query))
    ).slice(0, 10);
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
    setIsOpen(true);
  };

  const handleSelect = (s: Site) => {
    const val = s.site_alias ?? s.site_code;
    onChange(val, s);
    setIsOpen(false);
  };

  return (
    <div className="w-full relative" ref={containerRef}>
      <div onClick={() => !disabled && setIsOpen(true)}>
        <Input
          label={label}
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          error={error}
          hint={hint}
          icon={icon}
          className="uppercase"
          autoComplete="off"
        />
      </div>
      
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-[240px] overflow-y-auto z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
          {filteredSites.length > 0 ? (
            filteredSites.map((s) => {
              const val = s.site_alias ?? s.site_code;
              return (
                <div
                  key={s.site_code}
                  className="px-4 py-2 hover:bg-slate-700 cursor-pointer border-b border-slate-700/50 last:border-b-0 transition-colors"
                  onClick={() => handleSelect(s)}
                >
                  <p className="text-sm font-semibold text-slate-200 uppercase">{val}</p>
                  <p className="text-[11px] text-slate-400">{s.site_name} {s.region ? `(${s.region})` : ''}</p>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-3 text-sm text-slate-400 italic text-center">
              Tidak ada hasil yang cocok.
            </div>
          )}
        </div>
      )}

      {/* Real-time feedback badge */}
      {matchedSite ? (
        <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1.5 font-medium animate-fadeIn">
          <i className="fas fa-check-circle text-emerald-400 text-[11px]" />
          <span>
            Site terdeteksi: <b>{matchedSite.site_name}</b> {matchedSite.region ? `[Region: ${matchedSite.region}]` : ''}
          </span>
        </p>
      ) : value && value.trim() !== '' ? (
        <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1.5">
          <i className="fas fa-info-circle text-blue-400 text-[11px]" />
          <span>
            {customInfoText ? customInfoText(value) : `Alias / Kode lokasi: ${value.toUpperCase()}`}
          </span>
        </p>
      ) : null}
    </div>
  );
};

export default SiteSearchInput;

import type { Site } from '../types/inventory';

interface Props {
  sites: Site[];
  loading: boolean;
}

const SitesView = ({ sites, loading }: Props) => {
  if (loading) {
    return (
      <div className="fade-in text-center py-12">
        <i className="fas fa-spinner fa-spin text-2xl text-blue-400 mb-3 block"></i>
        <p className="text-slate-500 text-sm">Memuat daftar site...</p>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="fade-in text-center py-12">
        <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-building text-3xl text-slate-600"></i>
        </div>
        <p className="text-slate-500 text-sm">Tidak ada site terdaftar</p>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-3">
      {sites.map((s) => (
        <div key={s.site_code} className="history-item glass rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 text-xl">
            <i className="fas fa-building"></i>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{s.site_name}</h3>
            <div className="flex items-center gap-2 mt-1 text-xs font-mono">
              <span className="text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                Kode: {s.site_code}
              </span>
              {s.site_alias && (
                <span className="text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
                  Alias: {s.site_alias}
                </span>
              )}
            </div>
            {s.region && (
              <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                <i className="fas fa-map-marker-alt"></i>
                {s.region}
              </p>
            )}
            {s.site_address && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">{s.site_address}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SitesView;

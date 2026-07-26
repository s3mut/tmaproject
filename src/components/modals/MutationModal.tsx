import { useState } from 'react';
import type { AssetDetail, Site } from '../../types/inventory';

interface Props {
  isOpen: boolean;
  asset: AssetDetail | null;
  sites: Site[];
  onClose: () => void;
  onSubmit: (toSiteCode: string, notes: string) => Promise<void>;
}

const MutationModal = ({ isOpen, asset, sites, onClose, onSubmit }: Props) => {
  const [toSiteCode, setToSiteCode] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!asset) return null;

  const availableSites = sites.filter((s) => s.site_code !== asset.site_code);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toSiteCode) return;
    setSubmitting(true);
    try {
      await onSubmit(toSiteCode, notes);
      setToSiteCode('');
      setNotes('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`modal-overlay ${isOpen ? 'active' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Mutasi Aset</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Asset Info */}
        <div className="glass rounded-xl p-4 mb-5">
          <p className="text-xs text-slate-400 mb-1">Aset yang dipindah</p>
          <p className="text-sm font-bold text-white">{asset.brand} {asset.model_type ?? asset.serial_number}</p>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{asset.serial_number}</p>
        </div>

        {/* From → To */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 glass rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">Dari Site</p>
            <p className="text-sm font-semibold text-white">{asset.site_name ?? asset.site_code ?? '—'}</p>
            {asset.full_location_code && (
              <p className="text-xs text-slate-500 mt-0.5">{asset.full_location_code}</p>
            )}
          </div>
          <div className="text-slate-600">
            <i className="fas fa-arrow-right text-lg text-blue-400"></i>
          </div>
          <div className="flex-1 glass rounded-xl p-3 text-center border border-blue-500/30">
            <p className="text-xs text-slate-500 mb-1">Ke Site</p>
            <p className="text-sm font-semibold text-blue-400">
              {toSiteCode
                ? sites.find((s) => s.site_code === toSiteCode)?.site_name ?? toSiteCode
                : '— pilih —'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Site Tujuan */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Site Tujuan <span className="text-red-400">*</span>
            </label>
            <select
              value={toSiteCode}
              onChange={(e) => setToSiteCode(e.target.value)}
              className="form-input w-full rounded-lg px-4 py-3 text-sm"
              required
            >
              <option value="">— Pilih Site Tujuan —</option>
              {availableSites.map((s) => (
                <option key={s.site_code} value={s.site_code}>
                  {s.site_code} — {s.site_name} {s.region ? `(${s.region})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Catatan</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-input w-full rounded-lg px-4 py-3 text-sm resize-none"
              placeholder="Alasan pemindahan, kondisi aset, dll..."
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium text-sm">
              Batal
            </button>
            <button type="submit" disabled={submitting || !toSiteCode}
              className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-medium text-sm shadow-lg shadow-emerald-500/30 disabled:opacity-50">
              {submitting ? <i className="fas fa-spinner fa-spin"></i> : (
                <><i className="fas fa-exchange-alt mr-2"></i>Proses Mutasi</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MutationModal;

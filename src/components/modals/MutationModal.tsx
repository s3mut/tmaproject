import { useState } from 'react';
import type { AssetDetail, Site } from '../../types/inventory';
import { ModalShell, Button, SiteSearchInput, Textarea } from '../ui';

interface Props {
  isOpen:    boolean;
  asset:     AssetDetail | null;
  sites:     Site[];
  onClose:   () => void;
  onSubmit:  (toSiteCode: string, notes: string) => Promise<void>;
}

/**
 * MutationModal — refactored with design system components.
 */
const MutationModal = ({ isOpen, asset, sites, onClose, onSubmit }: Props) => {
  const [toSiteCode, setToSiteCode] = useState('');
  const [notes, setNotes]           = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!asset) return null;

  const availableSites = sites.filter(s => s.site_alias !== asset.site_alias);
  const destSite = sites.find(s => 
    s.site_alias?.toLowerCase() === toSiteCode.trim().toLowerCase() || 
    s.site_code?.toLowerCase() === toSiteCode.trim().toLowerCase()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toSiteCode) return;
    setSubmitting(true);
    try {
      const targetCode = destSite ? (destSite.site_alias ?? destSite.site_code) : toSiteCode.trim().toUpperCase();
      await onSubmit(targetCode, notes);
      setToSiteCode('');
      setNotes('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Mutasi Aset"
      titleIcon="fa-exchange-alt"
      titleIconBg="bg-emerald-500/20 text-emerald-400"
    >
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
          <p className="text-sm font-semibold text-white">{asset.site_name ?? asset.site_alias ?? '—'}</p>
          {asset.full_location_code && (
            <p className="text-xs text-slate-500 mt-0.5">{asset.full_location_code}</p>
          )}
        </div>
        <i className="fas fa-arrow-right text-lg text-blue-400" />
        <div className="flex-1 glass rounded-xl p-3 text-center border border-blue-500/30">
          <p className="text-xs text-slate-500 mb-1">Ke Site</p>
          <p className="text-sm font-semibold text-blue-400">
            {destSite ? destSite.site_name : '— pilih —'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <SiteSearchInput
          label="Site Tujuan (Ketik Alias / Kode)" required
          sites={availableSites}
          value={toSiteCode}
          onChange={(val) => setToSiteCode(val)}
          placeholder="Ketik Site Alias (contoh: CGK-01)..."
        />

        <Textarea
          label="Catatan"
          placeholder="Alasan pemindahan, kondisi aset, dll..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>Batal</Button>
          <Button
            type="submit"
            variant="success"
            fullWidth
            loading={submitting}
            disabled={!toSiteCode}
            icon="fa-exchange-alt"
          >
            Proses Mutasi
          </Button>
        </div>
      </form>
    </ModalShell>
  );
};

export default MutationModal;

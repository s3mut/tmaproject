import { useState } from 'react';
import type { AssetDetail, Site, Category } from '../../types/inventory';
import { ModalShell, Button } from '../ui';

interface Props {
  isOpen: boolean;
  asset?: AssetDetail | null;
  categories: Category[];
  sites: Site[];
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

const TransactionModal = ({ isOpen, asset, categories, sites, onClose, onSubmit }: Props) => {
  const [type, setType] = useState<'Mutation' | 'Borrowing' | 'Repair'>('Borrowing');
  const [categoryId, setCategoryId] = useState<number | ''>(asset?.category_id || '');
  const [toSiteCode, setToSiteCode] = useState<string>('');
  const [purpose, setPurpose] = useState('');
  const [durationDays, setDurationDays] = useState<number>(7);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      transaction_type: type,
      asset_id: asset?.id || null,
      category_id: categoryId || null,
      from_site_code: asset?.site_alias || null, // Simplified for demo
      to_site_code: toSiteCode,
      purpose,
      duration_days: type === 'Borrowing' ? durationDays : null,
    });
    // Reset state
    setType('Borrowing');
    setPurpose('');
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Buat Transaksi" titleIcon="fa-exchange-alt">
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Tipe Transaksi</label>
          <select 
            value={type} 
            onChange={e => setType(e.target.value as any)}
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="Borrowing">Peminjaman (Borrowing)</option>
            <option value="Mutation">Mutasi (Pindah Cabang)</option>
            <option value="Repair">Perbaikan (Repair)</option>
          </select>
        </div>

        {!asset && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Kategori Barang</label>
            <select 
              value={categoryId} 
              onChange={e => setCategoryId(Number(e.target.value))}
              required
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">-- Pilih Kategori --</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Tujuan / Site Penerima</label>
          <select 
            value={toSiteCode} 
            onChange={e => setToSiteCode(e.target.value)}
            required
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">-- Pilih Site --</option>
            {sites.map(s => (
              <option key={s.site_code} value={s.site_code}>{s.site_code} - {s.site_name}</option>
            ))}
          </select>
        </div>

        {type === 'Borrowing' && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Durasi Pinjam (Hari)</label>
            <input
              type="number"
              min="1"
              max="90"
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Tujuan / Catatan</label>
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-24"
            placeholder="Alasan peminjaman / catatan mutasi..."
            required
          />
        </div>

        <Button type="submit" variant="primary" fullWidth className="mt-4">Kirim Permintaan</Button>
      </form>
    </ModalShell>
  );
};

export default TransactionModal;

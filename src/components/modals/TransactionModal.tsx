import { useState } from 'react';
import type { AssetDetail, Site, Category } from '../../types/inventory';
import { ModalShell, Button, Select, Input, Textarea, SiteSearchInput } from '../ui';

interface Props {
  isOpen: boolean;
  asset?: AssetDetail | null;
  categories: Category[];
  sites: Site[];
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

const TransactionModal = ({ isOpen, asset, categories, sites, onClose, onSubmit }: Props) => {
  const [type, setType]                   = useState<'Mutation' | 'Borrowing' | 'Repair'>('Borrowing');
  const [categoryId, setCategoryId]       = useState<number | ''>(asset?.category_id || '');
  const [toSiteInput, setToSiteInput]     = useState<string>('');
  const [toSiteCode, setToSiteCode]       = useState<string>('');
  const [purpose, setPurpose]             = useState('');
  const [durationDays, setDurationDays]   = useState<number>(7);
  const [submitting, setSubmitting]       = useState(false);

  if (!isOpen) return null;

  /** Saat user mengetik site alias/kode, simpan nilai display & site_code FK terpisah */
  const handleSiteChange = (val: string, matched: Site | null) => {
    setToSiteInput(val);
    setToSiteCode(matched ? matched.site_code : val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        transaction_type: type,
        asset_id:         asset?.id || null,
        category_id:      categoryId || null,
        from_site_code:   asset?.site_alias || null,
        to_site_code:     toSiteCode,
        purpose,
        duration_days:    type === 'Borrowing' ? durationDays : null,
      });
      setType('Borrowing');
      setToSiteInput('');
      setToSiteCode('');
      setPurpose('');
      setDurationDays(7);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Buat Transaksi" titleIcon="fa-exchange-alt">
      <form onSubmit={handleSubmit} className="space-y-4">

        <Select
          label="Tipe Transaksi"
          value={type}
          onChange={(e) => setType(e.target.value as any)}
        >
          <option value="Borrowing">Peminjaman (Borrowing)</option>
          <option value="Mutation">Mutasi (Pindah Cabang)</option>
          <option value="Repair">Perbaikan (Repair)</option>
        </Select>

        {!asset && (
          <Select
            label="Kategori Barang"
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            required
          >
            <option value="">-- Pilih Kategori --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        )}

        <SiteSearchInput
          label="Lokasi Tujuan (Site Alias)"
          placeholder="Ketik kode atau alias site..."
          sites={sites}
          value={toSiteInput}
          onChange={handleSiteChange}
          required
          icon="fa-building"
        />

        {type === 'Borrowing' && (
          <Input
            label="Durasi Pinjam (Hari)"
            type="number"
            value={durationDays}
            onChange={(e) => setDurationDays(Number(e.target.value))}
            required
            icon="fa-calendar-alt"
          />
        )}

        <Textarea
          label="Tujuan / Catatan"
          placeholder="Alasan peminjaman / catatan mutasi..."
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          required
        />

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary" fullWidth loading={submitting}>
            Kirim Permintaan
          </Button>
        </div>
      </form>
    </ModalShell>
  );
};

export default TransactionModal;
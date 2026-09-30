import { useState } from 'react';
import type { AssetDetail, Site, Category } from '../../types/inventory';
import { ModalShell, Button, Select, Input, Textarea, SiteSearchInput } from '../ui';
import { useFormValidation } from '../../hooks/useFormValidation';

interface Props {
  isOpen: boolean;
  asset?: AssetDetail | null;
  categories: Category[];
  sites: Site[];
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

const TransactionModal = ({ isOpen, asset, categories, sites, onClose, onSubmit }: Props) => {
  const { values, errors, setFieldValue, validate, resetForm } = useFormValidation({
    type: 'Borrowing' as 'Mutation' | 'Borrowing' | 'Repair',
    categoryId: asset?.category_id || '',
    toSiteInput: '',
    toSiteCode: '',
    purpose: '',
    durationDays: 7,
  });
  
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSiteChange = (val: string, matched: Site | null) => {
    setFieldValue('toSiteInput', val);
    setFieldValue('toSiteCode', matched ? matched.site_code : val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = validate({
      categoryId: (val) => (!asset && !val) ? 'Kategori wajib dipilih' : null,
      toSiteCode: (val) => !val ? 'Lokasi tujuan wajib dipilih' : null,
      purpose: (val) => !val ? 'Tujuan / Catatan wajib diisi' : null,
      durationDays: (val) => (values.type === 'Borrowing' && (!val || val < 1)) ? 'Durasi pinjam minimal 1 hari' : null,
    });
    
    if (!isValid) return;

    setSubmitting(true);
    try {
      await onSubmit({
        transaction_type: values.type,
        asset_id:         asset?.id || null,
        category_id:      values.categoryId || null,
        from_site_code:   asset?.site_alias || null,
        to_site_code:     values.toSiteCode,
        purpose:          values.purpose,
        duration_days:    values.type === 'Borrowing' ? values.durationDays : null,
      });
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Buat Transaksi" titleIcon="fa-exchange-alt">
      <form onSubmit={handleSubmit} className="space-y-4">

        <Select
          label="Tipe Transaksi"
          value={values.type}
          onChange={(e) => setFieldValue('type', e.target.value as any)}
        >
          <option value="Borrowing">Peminjaman (Borrowing)</option>
          <option value="Mutation">Mutasi (Pindah Cabang)</option>
          <option value="Repair">Perbaikan (Repair)</option>
        </Select>

        {!asset && (
          <div>
            <Select
              label="Kategori Barang"
              value={values.categoryId}
              onChange={(e) => setFieldValue('categoryId', Number(e.target.value))}
            >
              <option value="">-- Pilih Kategori --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId}</p>}
          </div>
        )}

        <div>
          <SiteSearchInput
            label="Lokasi Tujuan (Site Alias)"
            placeholder="Ketik kode atau alias site..."
            sites={sites}
            value={values.toSiteInput}
            onChange={handleSiteChange}
            icon="fa-building"
          />
          {errors.toSiteCode && <p className="text-red-500 text-xs mt-1">{errors.toSiteCode}</p>}
        </div>

        {values.type === 'Borrowing' && (
          <div>
            <Input
              label="Durasi Pinjam (Hari)"
              type="number"
              value={values.durationDays}
              onChange={(e) => setFieldValue('durationDays', Number(e.target.value))}
              icon="fa-calendar-alt"
            />
            {errors.durationDays && <p className="text-red-500 text-xs mt-1">{errors.durationDays}</p>}
          </div>
        )}

        <div>
          <Textarea
            label="Tujuan / Catatan"
            placeholder="Alasan peminjaman / catatan mutasi..."
            value={values.purpose}
            onChange={(e) => setFieldValue('purpose', e.target.value)}
          />
          {errors.purpose && <p className="text-red-500 text-xs mt-1">{errors.purpose}</p>}
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={submitting}>Batal</Button>
          <Button type="submit" variant="primary" fullWidth disabled={submitting}>
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <i className="fas fa-spinner fa-spin"></i> Memproses...
              </span>
            ) : (
              'Kirim Permintaan'
            )}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
};

export default TransactionModal;
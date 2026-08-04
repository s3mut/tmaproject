import { useState, useEffect } from 'react';
import type { AssetDetail, AssetStatus, Site, Category } from '../../types/inventory';
import { ModalShell, Button, Input, Select, SiteSearchInput, Textarea } from '../ui';

interface FormData {
  serial_number: string;
  aktiva:        string;
  category_id:   number;
  brand:         string;
  model_type:    string;
  computer_name: string;
  site_alias:    string;
  status:        AssetStatus;
  external_id:   string;
  description:   string;
}

interface Props {
  isOpen:     boolean;
  editItem:   AssetDetail | null;
  sites:      Site[];
  categories: Category[];
  onClose:    () => void;
  onSubmit:   (data: FormData) => void;
}

const defaultForm: FormData = {
  serial_number: '', aktiva: '', category_id: 0, brand: '', model_type: '',
  computer_name: '', site_alias: '', status: 'Active', external_id: '', description: '',
};

/**
 * ItemFormModal — refactored with design system components.
 */
const ItemFormModal = ({ isOpen, editItem, sites, categories, onClose, onSubmit }: Props) => {
  const [form, setForm]         = useState<FormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (categories.length > 0 && form.category_id === 0) {
      setForm(prev => ({ ...prev, category_id: categories[0].id }));
    }
  }, [categories, form.category_id]);

  useEffect(() => {
    if (editItem) {
      setForm({
        serial_number:  editItem.serial_number,
        aktiva:         editItem.aktiva ?? '',
        category_id:    editItem.category_id,
        brand:          editItem.brand ?? '',
        model_type:     editItem.model_type ?? '',
        computer_name:  editItem.computer_name ?? '',
        site_alias:     editItem.site_alias ?? '',
        status:         editItem.status,
        external_id:    editItem.external_id ?? '',
        description:    editItem.description ?? '',
      });
    } else {
      setForm({ ...defaultForm, category_id: categories.length > 0 ? categories[0].id : 0 });
    }
  }, [editItem, isOpen, categories]);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try { await onSubmit(form); } finally { setSubmitting(false); }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={editItem ? 'Edit Aset' : 'Tambah Aset'}
      titleIcon={editItem ? 'fa-pen-to-square' : 'fa-plus'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Serial Number" required
          placeholder="S/N dari perangkat"
          value={form.serial_number}
          onChange={e => set('serial_number', e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Aktiva" placeholder="Nomor aktiva"
            value={form.aktiva} onChange={e => set('aktiva', e.target.value)} />
          <Input label="External ID" placeholder="ID eksternal"
            value={form.external_id} onChange={e => set('external_id', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select label="Kategori" required
            value={form.category_id} onChange={e => set('category_id', Number(e.target.value))}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="Status"
            value={form.status} onChange={e => set('status', e.target.value as AssetStatus)}>
            <option value="Active">Active</option>
            <option value="Backup">Backup</option>
            <option value="Repair">Repair</option>
            <option value="Disposed">Disposed</option>
            <option value="In Transit">In Transit</option>
            <option value="Retired">Retired</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Brand" placeholder="Dell, HP, Cisco..."
            value={form.brand} onChange={e => set('brand', e.target.value)} />
          <Input label="Model / Type" placeholder="Latitude 5520"
            value={form.model_type} onChange={e => set('model_type', e.target.value)} />
        </div>

        <Input label="Computer Name" placeholder="PC-JKT-001"
          value={form.computer_name} onChange={e => set('computer_name', e.target.value)} />

        <SiteSearchInput
          label="Site / Lokasi (Ketik Alias / Kode)"
          sites={sites}
          value={form.site_alias}
          onChange={val => set('site_alias', val)}
          placeholder="Ketik Site Alias (contoh: CGK-01)..."
        />

        <Textarea label="Deskripsi" placeholder="Catatan tambahan..."
          value={form.description} onChange={e => set('description', e.target.value)} />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary" fullWidth loading={submitting}>Simpan</Button>
        </div>
      </form>
    </ModalShell>
  );
};

export default ItemFormModal;

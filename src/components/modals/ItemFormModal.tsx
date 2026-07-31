import { useState, useEffect } from 'react';
import type { AssetDetail, AssetStatus, Site, Category } from '../../types/inventory';

interface FormData {
  serial_number: string;
  aktiva: string;
  category_id: number;
  brand: string;
  model_type: string;
  computer_name: string;
  site_alias: string;
  status: AssetStatus;
  external_id: string;
  description: string;
}

interface Props {
  isOpen: boolean;
  editItem: AssetDetail | null;
  sites: Site[];
  categories: Category[];
  onClose: () => void;
  onSubmit: (data: FormData) => void;
}

const defaultForm: FormData = {
  serial_number: '',
  aktiva: '',
  category_id: 0,
  brand: '',
  model_type: '',
  computer_name: '',
  site_alias: '',
  status: 'Active',
  external_id: '',
  description: '',
};

const ItemFormModal = ({ isOpen, editItem, sites, categories, onClose, onSubmit }: Props) => {
  const [form, setForm] = useState<FormData>(defaultForm);
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
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'form-input w-full rounded-lg px-4 py-3 text-sm';
  const labelCls = 'block text-xs font-medium text-slate-400 mb-1.5';

  return (
    <div className={`modal-overlay ${isOpen ? 'active' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{editItem ? 'Edit Aset' : 'Tambah Aset'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Serial Number */}
          <div>
            <label className={labelCls}>Serial Number <span className="text-red-400">*</span></label>
            <input type="text" value={form.serial_number} onChange={(e) => set('serial_number', e.target.value)}
              className={inputCls} placeholder="S/N dari perangkat" required />
          </div>

          {/* Aktiva + External ID */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Aktiva</label>
              <input type="text" value={form.aktiva} onChange={(e) => set('aktiva', e.target.value)}
                className={inputCls} placeholder="Nomor aktiva" />
            </div>
            <div>
              <label className={labelCls}>External ID</label>
              <input type="text" value={form.external_id} onChange={(e) => set('external_id', e.target.value)}
                className={inputCls} placeholder="ID eksternal" />
            </div>
          </div>

          {/* Category + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Kategori <span className="text-red-400">*</span></label>
              <select value={form.category_id} onChange={(e) => set('category_id', Number(e.target.value))} className={inputCls} required>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value as AssetStatus)} className={inputCls}>
                <option value="Active">Active</option>
                <option value="Backup">Backup</option>
                <option value="Repair">Repair</option>
                <option value="Disposed">Disposed (Dihapus)</option>
                <option value="In Transit">In Transit</option>
                <option value="Retired">Retired (Pensiun)</option>
              </select>
            </div>
          </div>

          {/* Brand + Model Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Brand</label>
              <input type="text" value={form.brand} onChange={(e) => set('brand', e.target.value)}
                className={inputCls} placeholder="Dell, HP, Cisco..." />
            </div>
            <div>
              <label className={labelCls}>Model / Type</label>
              <input type="text" value={form.model_type} onChange={(e) => set('model_type', e.target.value)}
                className={inputCls} placeholder="Latitude 5520" />
            </div>
          </div>

          {/* Computer Name */}
          <div>
            <label className={labelCls}>Computer Name</label>
            <input type="text" value={form.computer_name} onChange={(e) => set('computer_name', e.target.value)}
              className={inputCls} placeholder="PC-JKT-001" />
          </div>

          {/* Site */}
          <div>
            <label className={labelCls}>Site / Lokasi</label>
            <select value={form.site_alias} onChange={(e) => set('site_alias', e.target.value)} className={inputCls}>
              <option value="">— Pilih Site —</option>
              {sites.map((s) => (
                <option key={s.site_alias ?? s.site_code} value={s.site_alias ?? ''}>
                  {s.site_alias ?? s.site_code} — {s.site_name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Deskripsi</label>
            <textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)}
              className={`${inputCls} resize-none`} placeholder="Catatan tambahan..." />
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium text-sm">
              Batal
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium text-sm shadow-lg shadow-blue-500/30 disabled:opacity-60">
              {submitting ? <i className="fas fa-spinner fa-spin"></i> : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ItemFormModal;

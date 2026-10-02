import { useState, useEffect } from 'react';
import type { AssetDetail, AssetStatus, Site, Category } from '../../types/inventory';
import { ModalShell, Button, Input, Select, SiteSearchInput, Textarea } from '../ui';
import QRScannerModal from './QRScannerModal';
import { triggerHaptic } from '../../utils/telegramHaptics';
import { useFormValidation } from '../../hooks/useFormValidation';

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
 * ItemFormModal — refactored with design system components & barcode scanner integration.
 */
const ItemFormModal = ({ isOpen, editItem, sites, categories, onClose, onSubmit }: Props) => {
  const { values, errors, setFieldValue, validate, resetForm } = useFormValidation<FormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [activeScanField, setActiveScanField] = useState<'serial_number' | 'aktiva' | 'external_id' | null>(null);

  useEffect(() => {
    if (categories.length > 0 && values.category_id === 0) {
      setFieldValue('category_id', categories[0].id);
    }
  }, [categories, values.category_id, setFieldValue]);

  useEffect(() => {
    if (editItem) {
      resetForm({
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
      resetForm({ ...defaultForm, category_id: categories.length > 0 ? categories[0].id : 0 });
    }
  }, [editItem, isOpen, categories, resetForm]);

  const handleScanResult = (scannedText: string) => {
    if (activeScanField) {
      setFieldValue(activeScanField, scannedText.trim());
      triggerHaptic('success');
    }
    setActiveScanField(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validate({
      serial_number: (val) => !val.trim() ? 'Serial Number wajib diisi' : null,
      category_id: (val) => val <= 0 ? 'Kategori wajib dipilih' : null,
      site_alias: (val) => !val.trim() ? 'Lokasi cabang wajib dipilih' : null
    });
    if (!isValid) return;
    setSubmitting(true);
    try { await onSubmit(values); } finally { setSubmitting(false); }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={editItem ? 'Edit Aset' : 'Tambah Aset'}
      titleIcon={editItem ? 'fa-pen-to-square' : 'fa-plus'}
    >
      <form autoComplete="off" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            label="Serial Number" required
            placeholder="S/N dari perangkat"
            value={values.serial_number}
            onChange={e => setFieldValue('serial_number', e.target.value)}
            error={errors.serial_number}
          >
            <button
              type="button"
              onClick={() => setActiveScanField('serial_number')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-400 hover:bg-slate-800/80 active:scale-95 transition-all cursor-pointer"
              title="Scan Serial Number / Barcode dengan Kamera"
            >
              <i className="fas fa-qrcode text-base" />
            </button>
          </Input>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Aktiva"
            placeholder="Nomor aktiva"
            value={values.aktiva}
            onChange={e => setFieldValue('aktiva', e.target.value)}
          >
            <button
              type="button"
              onClick={() => setActiveScanField('aktiva')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-400 hover:bg-slate-800/80 active:scale-95 transition-all cursor-pointer"
              title="Scan Barcode Aktiva dengan Kamera"
            >
              <i className="fas fa-qrcode text-base" />
            </button>
          </Input>

          <Input
            label="External ID"
            placeholder="ID eksternal"
            value={values.external_id}
            onChange={e => setFieldValue('external_id', e.target.value)}
          >
            <button
              type="button"
              onClick={() => setActiveScanField('external_id')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-400 hover:bg-slate-800/80 active:scale-95 transition-all cursor-pointer"
              title="Scan External ID dengan Kamera"
            >
              <i className="fas fa-qrcode text-base" />
            </button>
          </Input>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Select label="Kategori" required
              value={values.category_id} onChange={e => setFieldValue('category_id', Number(e.target.value))}
              error={errors.category_id}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <Select label="Status"
            value={values.status} onChange={e => setFieldValue('status', e.target.value as AssetStatus)}>
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
            value={values.brand} onChange={e => setFieldValue('brand', e.target.value)} />
          <Input label="Model / Type" placeholder="Latitude 5520"
            value={values.model_type} onChange={e => setFieldValue('model_type', e.target.value)} />
        </div>

        <Input label="Computer Name" placeholder="PC-JKT-001"
          value={values.computer_name} onChange={e => setFieldValue('computer_name', e.target.value)} />

        <div>
          <SiteSearchInput
            label="Lokasi Cabang (Site Alias)"
            sites={sites}
            value={values.site_alias}
            onChange={val => setFieldValue('site_alias', val)}
            placeholder="Ketik kode atau alias site..."
            error={errors.site_alias}
          />
        </div>

        <Textarea label="Deskripsi" placeholder="Catatan tambahan..."
          value={values.description} onChange={e => setFieldValue('description', e.target.value)} />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={submitting}>Batal</Button>
          <Button type="submit" variant="primary" fullWidth disabled={submitting}>
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <i className="fas fa-spinner fa-spin"></i> Memproses...
              </span>
            ) : (
              'Simpan'
            )}
          </Button>
        </div>
      </form>

      {/* Camera QR/Barcode Scanner Modal */}
      <QRScannerModal
        isOpen={activeScanField !== null}
        onClose={() => setActiveScanField(null)}
        onScanResult={handleScanResult}
      />
    </ModalShell>
  );
};

export default ItemFormModal;




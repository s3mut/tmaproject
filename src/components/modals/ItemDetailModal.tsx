import { useState } from 'react';
import type { AssetDetail } from '../../types/inventory';
import StatusBadge from '../StatusBadge';

interface Props {
  isOpen: boolean;
  item: AssetDetail | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMutate: () => void;
}

const DetailRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
  value ? (
    <div className="glass rounded-lg p-3 flex justify-between items-center gap-4">
      <span className="text-xs text-slate-400 shrink-0">{label}</span>
      <span className="text-sm font-medium text-white text-right">{value}</span>
    </div>
  ) : null
);

const ItemDetailModal = ({ isOpen, item, onClose, onEdit, onDelete, onMutate }: Props) => {
  const [copied, setCopied] = useState(false);

  if (!item) return null;

  const copySerial = () => {
    navigator.clipboard.writeText(item.serial_number).catch(() => {
      // fallback for environments that don't support clipboard API
      const el = document.createElement('textarea');
      el.value = item.serial_number;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`modal-overlay ${isOpen ? 'active' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Detail Aset</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Header Info */}
        <div className="text-center mb-5">
          <div className={`w-20 h-20 rounded-2xl ${item.category_color_bg} ${item.category_color_text} flex items-center justify-center mx-auto mb-3 text-2xl`}>
            <i className={`fas ${item.category_icon}`}></i>
          </div>
          <h3 className="text-lg font-bold text-white">{item.brand} {item.model_type ?? ''}</h3>
          {/* Serial Number — tap to copy */}
          <button
            onClick={copySerial}
            className="flex items-center gap-2 mx-auto mt-0.5 px-3 py-1 rounded-lg hover:bg-slate-700/50 transition-colors group"
          >
            <p className="text-sm text-slate-400 font-mono">{item.serial_number}</p>
            <i className={`fas ${copied ? 'fa-check text-emerald-400' : 'fa-copy text-slate-500 group-hover:text-blue-400'} text-xs transition-colors`}></i>
          </button>
          {copied && <p className="text-xs text-emerald-400 mt-1">Tersalin!</p>}
          <div className="flex justify-center mt-2">
            <StatusBadge status={item.status} />
          </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-2 mb-4">
          <DetailRow label="Kategori"       value={item.category_name} />
          <DetailRow label="Aktiva"         value={item.aktiva} />
          <DetailRow label="Computer Name"  value={item.computer_name} />
          <DetailRow label="Site"           value={item.site_name} />
          <DetailRow label="Lokasi Code"    value={item.full_location_code} />
          <DetailRow label="Alamat Site"    value={item.site_address} />
          {item.description && (
            <div className="glass rounded-lg p-3">
              <span className="text-xs text-slate-400 block mb-1">Deskripsi</span>
              <p className="text-sm text-white">{item.description}</p>
            </div>
          )}
          <DetailRow label="Tanggal Input"  value={item.created_at?.split('T')[0]} />
          <DetailRow label="Last Update"    value={item.updated_at?.split('T')[0]} />
        </div>

        {/* QR Placeholder */}
        <div className="qr-placeholder rounded-xl p-4 text-center mb-4">
          <i className="fas fa-qrcode text-4xl text-blue-500/30 mb-1 block"></i>
          <p className="text-xs text-slate-500 font-mono">{item.serial_number}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={onMutate} className="flex-1 py-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 font-medium text-sm">
            <i className="fas fa-exchange-alt mr-1"></i>Pindah
          </button>
          <button onClick={onEdit} className="flex-1 py-2.5 rounded-xl bg-blue-600/20 text-blue-400 font-medium text-sm">
            <i className="fas fa-edit mr-1"></i>Edit
          </button>
          <button onClick={onDelete} className="flex-1 py-2.5 rounded-xl bg-red-600/20 text-red-400 font-medium text-sm">
            <i className="fas fa-trash mr-1"></i>Hapus
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailModal;

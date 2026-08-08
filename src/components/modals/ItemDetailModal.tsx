import { useState } from 'react';
import type { AssetDetail } from '../../types/inventory';
import { ModalShell, Button } from '../ui';
import { AssetBadge } from '../ui/Badge';

interface Props {
  isOpen:   boolean;
  item:     AssetDetail | null;
  onClose:  () => void;
  onEdit:   () => void;
  onDelete: () => void;
  onMutate: () => void;
}

const DetailRow = ({ label, value }: { label: string; value: string | null | undefined }) =>
  value ? (
    <div className="glass rounded-lg p-3 flex justify-between items-center gap-4">
      <span className="text-xs text-slate-400 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-50 text-right">{value}</span>
    </div>
  ) : null;

/**
 * ItemDetailModal — refactored with design system components.
 */
const ItemDetailModal = ({ isOpen, item, onClose, onEdit, onDelete, onMutate }: Props) => {
  const [copied, setCopied] = useState(false);

  if (!item) return null;

  const copySerial = () => {
    navigator.clipboard.writeText(item.serial_number).catch(() => {
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
    <ModalShell isOpen={isOpen} onClose={onClose} title="Detail Aset" titleIcon="fa-info-circle">
      {/* Header Info */}
      <div className="text-center mb-5">
        <div className={`w-20 h-20 rounded-2xl ${item.category_color_bg} ${item.category_color_text} flex items-center justify-center mx-auto mb-3 text-2xl`}>
          <i className={`fas ${item.category_icon}`} />
        </div>
        <h3 className="text-lg font-bold text-slate-50">{item.brand} {item.model_type ?? ''}</h3>
        <button
          onClick={copySerial}
          className="flex items-center gap-2 mx-auto mt-0.5 px-3 py-1 rounded-lg hover:bg-slate-700/50 transition-colors group"
        >
          <p className="text-sm text-slate-400 font-mono">{item.serial_number}</p>
          <i className={`fas ${copied ? 'fa-check text-emerald-400' : 'fa-copy text-slate-500 group-hover:text-blue-400'} text-xs transition-colors`} />
        </button>
        {copied && <p className="text-xs text-emerald-400 mt-1">Tersalin!</p>}
        <div className="flex justify-center mt-2">
          <AssetBadge status={item.status} />
        </div>
      </div>

      {/* Details Grid */}
      <div className="space-y-2 mb-4">
        <DetailRow label="Kategori"      value={item.category_name} />
        <DetailRow label="Aktiva"        value={item.aktiva} />
        <DetailRow label="Computer Name" value={item.computer_name} />
        <DetailRow label="Site"          value={item.site_name} />
        <DetailRow label="Lokasi Code"   value={item.full_location_code} />
        <DetailRow label="Alamat Site"   value={item.site_address} />
        {item.description && (
          <div className="glass rounded-lg p-3">
            <span className="text-xs text-slate-400 block mb-1">Deskripsi</span>
            <p className="text-sm text-slate-50">{item.description}</p>
          </div>
        )}
        <DetailRow label="Tanggal Input" value={item.created_at?.split('T')[0]} />
        <DetailRow label="Last Update"   value={item.updated_at?.split('T')[0]} />
      </div>

      {/* QR Placeholder */}
      <div className="qr-placeholder rounded-xl p-4 text-center mb-5">
        <i className="fas fa-qrcode text-4xl text-blue-500/30 mb-1 block" />
        <p className="text-xs text-slate-500 font-mono">{item.serial_number}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="ghost" fullWidth icon="fa-exchange-alt" onClick={onMutate}
          className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20">
          Pindah
        </Button>
        <Button variant="ghost" fullWidth icon="fa-pen" onClick={onEdit}
          className="bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20">
          Edit
        </Button>
        <Button variant="ghost" fullWidth icon="fa-trash" onClick={onDelete}
          className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">
          Hapus
        </Button>
      </div>
    </ModalShell>
  );
};

export default ItemDetailModal;

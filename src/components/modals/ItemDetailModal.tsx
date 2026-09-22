import { useState } from 'react';
import type { AssetDetail } from '../../types/inventory';
import { LOCKED_ASSET_STATUSES } from '../../types/inventory';
import { ModalShell, Button } from '../ui';
import { AssetBadge } from '../ui/Badge';
import DocumentTimeline from '../DocumentTimeline';

interface Props {
  isOpen:   boolean;
  item:     AssetDetail | null;
  onClose:  () => void;
  onEdit:   () => void;
  onDelete: () => void;
  onMutate: () => void;
  onProposeDisposal?: () => void;
  currentUserRole?: string;
}

type DetailTab = 'info' | 'timeline';

const DetailRow = ({ label, value }: { label: string; value: string | null | undefined }) =>
  value ? (
    <div className="glass rounded-lg p-3 flex justify-between items-center gap-4">
      <span className="text-xs text-slate-400 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-50 text-right">{value}</span>
    </div>
  ) : null;

/**
 * ItemDetailModal — dengan tab "Detail" & "Riwayat Pergerakan" (DocumentTimeline)
 * + tombol "Usulkan Afkir" yang muncul untuk aset yang belum PENDING_DISPOSAL/Disposed.
 * + Lock aset PENDING_DISPOSAL dari tombol Pindah.
 */
const ItemDetailModal = ({ isOpen, item, onClose, onEdit, onDelete, onMutate, onProposeDisposal, currentUserRole }: Props) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('info');

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

  // Aset terkunci dari transaksi jika PENDING_DISPOSAL atau Disposed
  const isLocked = LOCKED_ASSET_STATUSES.includes(item.status as any);
  const canProposeDisposal =
    !isLocked &&
    ['admin', 'super_admin'].includes(currentUserRole ?? '') &&
    onProposeDisposal != null;

  const handleClose = () => {
    setActiveTab('info');
    onClose();
  };

  return (
    <ModalShell isOpen={isOpen} onClose={handleClose} title="Detail Aset" titleIcon="fa-info-circle">
      {/* Header Info */}
      <div className="text-center mb-4">
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
        <div className="flex justify-center mt-2 gap-2">
          <AssetBadge status={item.status} />
          {isLocked && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
              <i className="fas fa-lock text-[9px]" />
              Terkunci
            </span>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex rounded-xl overflow-hidden border border-slate-700/50 mb-4">
        {(['info', 'timeline'] as DetailTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === tab
                ? 'bg-blue-500/20 text-blue-300 border-b-2 border-blue-500'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            <i className={`fas ${tab === 'info' ? 'fa-info-circle' : 'fa-stream'} text-xs`} />
            {tab === 'info' ? 'Detail' : 'Riwayat'}
          </button>
        ))}
      </div>

      {/* Tab: Detail */}
      {activeTab === 'info' && (
        <>
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

          {/* Lock Notice for PENDING_DISPOSAL */}
          {isLocked && (
            <div className="rounded-xl p-3 mb-4 bg-orange-500/10 border border-orange-500/30 flex items-center gap-2">
              <i className="fas fa-lock text-orange-400 text-sm flex-shrink-0" />
              <p className="text-xs text-orange-300/90">
                Aset ini <strong>terkunci</strong> dari semua transaksi karena berstatus{' '}
                <strong>{item.status}</strong>.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {/* Row 1: Pindah + Edit */}
            <div className="flex gap-2">
              {!isLocked && (
                <Button variant="ghost" fullWidth icon="fa-exchange-alt" onClick={onMutate}
                  className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20">
                  Pindah
                </Button>
              )}
              <Button variant="ghost" fullWidth icon="fa-pen" onClick={onEdit}
                className="bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20">
                Edit
              </Button>
              <Button variant="ghost" fullWidth icon="fa-trash" onClick={onDelete}
                className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">
                Hapus
              </Button>
            </div>

            {/* Row 2: Usulkan Afkir (hanya untuk admin & aset tidak terkunci) */}
            {canProposeDisposal && (
              <Button
                variant="ghost"
                fullWidth
                icon="fa-trash-alt"
                onClick={onProposeDisposal}
                className="bg-orange-500/10 text-orange-300 border border-orange-500/30 hover:bg-orange-500/20 w-full"
              >
                Usulkan Afkir
              </Button>
            )}
          </div>
        </>
      )}

      {/* Tab: Riwayat Pergerakan (DocumentTimeline) */}
      {activeTab === 'timeline' && (
        <DocumentTimeline
          assetId={item.id}
          serialNumber={item.serial_number}
        />
      )}
    </ModalShell>
  );
};

export default ItemDetailModal;

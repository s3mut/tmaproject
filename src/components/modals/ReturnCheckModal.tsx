import React, { useState } from 'react';
import type { AssetLoan } from '../../types/inventory';
import { ModalShell, Button, Textarea } from '../ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  loan: AssetLoan | null;
  onCloseTicket: (params: {
    loanId: number;
    assetId: number;
    condition: 'Bagus' | 'Rusak' | 'Hilang' | string;
    notes: string;
  }) => Promise<void>;
}

const ReturnCheckModal: React.FC<Props> = ({
  isOpen,
  onClose,
  loan,
  onCloseTicket,
}) => {
  const [condition, setCondition] = useState<'Bagus' | 'Rusak' | 'Hilang'>('Bagus');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!loan) return null;

  const conditions = [
    {
      value: 'Bagus',
      label: 'Bagus / Siap Pakai (Ready)',
      desc: 'Kondisi normal. Status unit akan reset kembali ke "Backup / Active" di gudang IT.',
      color: 'border-emerald-500 bg-emerald-500/15 text-emerald-300',
      unselected: 'border-slate-700 bg-slate-800/60 text-slate-400',
      icon: 'fa-check-circle text-emerald-400',
    },
    {
      value: 'Rusak',
      label: 'Rusak / Perlu Perbaikan (Repair)',
      desc: 'Unit mengalami cacat atau eror dari Toko. Status unit akan dialihkan ke "Repair".',
      color: 'border-amber-500 bg-amber-500/15 text-amber-300',
      unselected: 'border-slate-700 bg-slate-800/60 text-slate-400',
      icon: 'fa-tools text-amber-400',
    },
    {
      value: 'Hilang',
      label: 'Hilang / Klaim Penggantian',
      desc: 'Unit hilang di ekspedisi atau di toko. Status akan dialihkan ke "Disposed/Hilang".',
      color: 'border-red-500 bg-red-500/15 text-red-300',
      unselected: 'border-slate-700 bg-slate-800/60 text-slate-400',
      icon: 'fa-exclamation-triangle text-red-400',
    },
  ] as const;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      setSubmitting(true);
      await onCloseTicket({
        loanId: loan.id,
        assetId: loan.asset_id || 0,
        condition,
        notes: notes.trim(),
      });
      setNotes('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menutup tiket pengembalian.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Verifikasi Fisik & Tutup Tiket"
      titleIcon="fa-clipboard-check"
      titleIconBg="bg-emerald-500/20 text-emerald-400"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info Aset Kembalian */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Unit Yang Dikembalikan:</span>
            <p className="font-bold text-slate-50 text-sm mt-0.5">{loan.asset_brand || 'Aset'} {loan.asset_model_type || ''}</p>
            <p className="text-amber-300 font-mono text-xs">S/N: {loan.asset_serial_number || '—'}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">Dari Toko:</span>
            <p className="font-bold text-emerald-300 text-sm">{loan.site_alias}</p>
            <span className="text-[10px] font-mono text-slate-500">{loan.loan_code}</span>
          </div>
        </div>

        {/* Pilihan Kondisi */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            ① Hasil Pengecekan Kondisi Barang (Oleh Tim IT)
          </label>
          <div className="grid grid-cols-1 gap-2.5">
            {conditions.map((item) => {
              const isSelected = condition === item.value;
              return (
                <div
                  key={item.value}
                  onClick={() => setCondition(item.value as any)}
                  className={`border rounded-xl p-3 cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected ? item.color : item.unselected
                  }`}
                >
                  <i className={`fas ${item.icon} text-lg mt-0.5 shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-50">{item.label}</p>
                      {isSelected && <i className="fas fa-check-circle text-xs text-slate-50" />}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-normal">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Catatan Tambahan */}
        <div>
          <Textarea
            label="② Catatan Pengecekan / Kelengkapan Aksesori (Opsional)"
            rows={3}
            placeholder="Contoh: Unit lengkap beserta adaptor dan kabel VGA, dites hidup normal Tanpa lecet."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
          />
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <i className="fas fa-exclamation-circle text-base shrink-0"></i>
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button type="submit" variant="primary" fullWidth loading={submitting} icon="fa-check-double">
            Konfirmasi & Tutup Tiket
          </Button>
        </div>
      </form>
    </ModalShell>
  );
};

export default ReturnCheckModal;

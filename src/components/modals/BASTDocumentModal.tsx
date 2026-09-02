import React from 'react';
import { ModalShell, Button } from '../ui';
import { printDocument } from '../../utils/printDocument';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AssetLoanCompat = any;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  loan: AssetLoanCompat | null;
  mode?: 'peminjaman' | 'pengembalian';
}

const BASTDocumentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  loan,
  mode = 'peminjaman',
}) => {
  if (!loan) return null;

  const isReturn = mode === 'pengembalian';
  const docTitle = isReturn
    ? 'BERITA ACARA PENGEMBALIAN UNIT (RMA RETURN)'
    : 'BERITA ACARA SERAH TERIMA PEMINJAMAN UNIT BACKUP';

  const dateFormatted = new Date(
    isReturn ? (loan.returned_at || Date.now()) : (loan.dispatched_at || loan.created_at)
  ).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

  const dueDateFormatted = new Date(loan.due_date).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  // ── Generate HTML lengkap untuk print ─────────────────────────────────────
  const generateBastHtml = (): string => `
    <div style="border-bottom: 2px solid #111827; padding-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
      <div>
        <h1 style="font-size: 22px; font-weight: 900; color: #111827; letter-spacing: -0.5px;">E1-TMA</h1>
        <p style="font-size: 10px; color: #4b5563; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 3px;">
          IT Asset &amp; Device Logistics Management
        </p>
      </div>
      <div style="text-align: right;">
        <span style="display: inline-block; background: #111827; color: #f9fafb; font-size: 11px; font-weight: 700; font-family: monospace; padding: 4px 10px; border-radius: 4px;">
          ${loan.loan_code}
        </span>
        <p style="font-size: 11px; color: #6b7280; margin-top: 4px; font-family: monospace;">Tanggal: ${dateFormatted}</p>
      </div>
    </div>

    <div style="text-align: center; padding: 10px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 20px;">
      <h2 style="font-size: 13px; font-weight: 900; text-transform: uppercase; color: #111827; letter-spacing: 0.5px;">${docTitle}</h2>
    </div>

    <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
      <div style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
        <span style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; display: block; margin-bottom: 4px; letter-spacing: 0.5px;">
          Pihak 1 (Tim IT / Gudang):
        </span>
        <p style="font-size: 14px; font-weight: 800; color: #111827;">${loan.dispatched_by_name || 'Tim IT Support'}</p>
        <p style="font-size: 11px; color: #4b5563; margin-top: 2px;">Departemen: IT &amp; Asset Logistics</p>
        <p style="font-size: 11px; color: #6b7280; margin-top: 2px;">Metode Pengiriman: ${loan.shipping_method || 'Pick-up'}</p>
      </div>
      <div style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
        <span style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; display: block; margin-bottom: 4px; letter-spacing: 0.5px;">
          Pihak 2 (Toko / Peminjam):
        </span>
        <p style="font-size: 14px; font-weight: 800; color: #111827;">${loan.requested_by_name} (${loan.site_alias})</p>
        <p style="font-size: 11px; color: #4b5563; margin-top: 2px;">Lokasi: ${loan.site_alias} — ${loan.site_code || loan.site_name} (Region: ${loan.site_region || 'Indonesia'})</p>
        <p style="font-size: 11px; color: #6b7280; margin-top: 2px;">Resi/Tracking: ${loan.tracking_number || '—'}</p>
      </div>
    </div>

    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #374151; letter-spacing: 0.5px; margin-bottom: 10px;">
        Rincian Unit Aset Yang Diserahterimakan:
      </h3>
      <table style="width: 100%; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; font-size: 12px;">
        <thead>
          <tr style="background: #e5e7eb; color: #374151; font-weight: 700;">
            <th style="padding: 10px; border-bottom: 1px solid #d1d5db;">Kategori</th>
            <th style="padding: 10px; border-bottom: 1px solid #d1d5db;">Brand &amp; Model</th>
            <th style="padding: 10px; border-bottom: 1px solid #d1d5db;">Serial Number / Aktiva</th>
            <th style="padding: 10px; border-bottom: 1px solid #d1d5db; text-align: right;">Durasi &amp; Jatuh Tempo</th>
          </tr>
        </thead>
        <tbody>
          <tr style="font-weight: 500;">
            <td style="padding: 10px; font-weight: 700; color: #111827;">${loan.category_name}</td>
            <td style="padding: 10px; color: #374151;">${loan.asset_brand || 'Aset'} — ${loan.asset_model_type || ''}</td>
            <td style="padding: 10px; font-family: monospace; font-weight: 700; color: #1e40af;">${loan.asset_serial_number || 'Belum discan IT'}</td>
            <td style="padding: 10px; text-align: right; font-weight: 600;">
              ${loan.duration_days} Hari<br/>
              <span style="font-size: 10px; color: #dc2626; font-family: monospace;">Due: ${dueDateFormatted}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p style="font-size: 11px; color: #4b5563; margin-top: 8px; font-style: italic;">
        <strong>Tujuan Penggunaan / Alasan:</strong> "${loan.purpose}"
      </p>
    </div>

    <div style="padding: 12px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; margin-bottom: 24px;">
      <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #92400e; display: block; margin-bottom: 6px; letter-spacing: 0.5px;">
        Syarat &amp; Ketentuan Serah Terima:
      </span>
      <ul style="font-size: 11px; color: #78350f; padding-left: 16px; line-height: 1.7;">
        <li>Unit tersebut di atas merupakan hak milik sah Perusahaan dan dipinjamkan khusus untuk mendukung kelancaran operasional Toko/Cabang.</li>
        <li>Pihak Penerima di Toko wajib merawat unit dengan baik serta menjaga keutuhan stiker barcode/serial number dan aksesoris pendukungnya.</li>
        <li>Unit wajib dikembalikan selambat-lambatnya pada tanggal jatuh tempo (<strong>${loan.duration_days} hari sejak penyerahan</strong>). Keterlambatan tanpa approval perpanjangan dari Tim IT akan dikenakan eskalasi ke Kepala Toko dan Area Manager.</li>
      </ul>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; text-align: center; padding-top: 16px; border-top: 1px solid #e5e7eb;">
      <div>
        <p style="font-size: 11px; color: #6b7280; font-weight: 600; margin-bottom: 64px;">
          ${isReturn ? 'Diserahkan Oleh (Peminjam Toko)' : 'Diserahkan Oleh (Tim IT / Gudang)'}
        </p>
        <p style="font-size: 12px; font-weight: 700; color: #111827; text-decoration: underline;">
          ${isReturn ? (loan.requested_by_name || 'Kepala Toko') : (loan.dispatched_by_name || 'Petugas Gudang IT')}
        </p>
        <span style="font-size: 10px; color: #9ca3af;">Tanggal: ${dateFormatted}</span>
      </div>
      <div>
        <p style="font-size: 11px; color: #6b7280; font-weight: 600; margin-bottom: 64px;">
          ${isReturn ? 'Diterima Oleh (Tim IT / Gudang)' : 'Diterima Oleh (Peminjam Toko)'}
        </p>
        <p style="font-size: 12px; font-weight: 700; color: #111827; text-decoration: underline;">
          ${isReturn ? 'Petugas Gudang IT / Admin' : (loan.received_by_name || loan.requested_by_name || 'Penerima Toko')}
        </p>
        <span style="font-size: 10px; color: #9ca3af;">Tanggal: ${dateFormatted}</span>
      </div>
    </div>
  `;

  const handlePrint = () => {
    printDocument({
      title: `BAST ${loan.loan_code} — ${docTitle}`,
      html: generateBastHtml(),
      autoClose: false,
    });
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Dokumen Resmi BAST & Shipping Label"
      titleIcon="fa-file-contract"
      titleIconBg="bg-purple-500/20 text-purple-400"
    >
      <div className="space-y-4">
        {/* Instruksi Print */}
        <div className="bg-blue-500/15 border border-blue-500/40 rounded-xl p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-blue-700 dark:text-blue-200">
            <i className="fas fa-print text-blue-600 dark:text-blue-400 text-lg shrink-0" />
            <span>Klik tombol cetak untuk membuka dokumen BAST di jendela baru dan menyimpannya sebagai PDF.</span>
          </div>
          <Button size="sm" variant="primary" icon="fa-print" onClick={handlePrint} className="shrink-0">
            Cetak / Save PDF
          </Button>
        </div>

        {/* Preview BAST (tampilan di modal, bukan hasil cetak) */}
        <div className="bg-white text-gray-900 p-5 rounded-2xl border border-gray-300 shadow-inner space-y-5 select-text overflow-y-auto max-h-[55vh]">
          {/* Header */}
          <div className="border-b-2 border-gray-900 pb-3 flex items-start justify-between">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-gray-900">E1-TMA</h1>
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">
                IT Asset &amp; Device Logistics Management
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-gray-900 text-gray-50 text-xs font-bold font-mono rounded">
                {loan.loan_code}
              </span>
              <p className="text-[11px] text-gray-500 mt-1 font-mono">Tanggal: {dateFormatted}</p>
            </div>
          </div>

          {/* Judul */}
          <div className="text-center py-2 bg-gray-100 rounded-lg border border-gray-300">
            <h2 className="text-xs font-black uppercase text-gray-900 tracking-wide">{docTitle}</h2>
          </div>

          {/* Pihak */}
          <div className="flex flex-col gap-2.5 text-xs">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Pihak 1 (Tim IT / Gudang):</span>
              <p className="text-sm font-bold text-gray-900">{loan.dispatched_by_name || 'Tim IT Support'}</p>
              <p className="text-gray-500 mt-0.5">Departemen: IT &amp; Asset Logistics &nbsp;|&nbsp; Metode: {loan.shipping_method}</p>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Pihak 2 (Toko / Peminjam):</span>
              <p className="text-sm font-bold text-gray-900">{loan.requested_by_name} ({loan.site_alias})</p>
              <p className="text-gray-500 mt-0.5">Lokasi: {loan.site_alias} — {loan.site_code || loan.site_name} (Region: {loan.site_region || 'Indonesia'})</p>
              <p className="text-gray-400 text-[11px]">Resi/Tracking: {loan.tracking_number || '—'}</p>
            </div>
          </div>

          {/* Aset */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase text-gray-600 tracking-wider">Rincian Unit Aset:</h3>
            <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-100 text-gray-700 font-bold">
                  <th className="p-2.5 text-left">Kategori</th>
                  <th className="p-2.5 text-left">Brand & Model</th>
                  <th className="p-2.5 text-left">S/N</th>
                  <th className="p-2.5 text-right">Jatuh Tempo</th>
                </tr>
              </thead>
              <tbody>
                <tr className="font-medium">
                  <td className="p-2.5 font-bold text-gray-900">{loan.category_name}</td>
                  <td className="p-2.5 text-gray-600">{loan.asset_brand || '—'} {loan.asset_model_type || ''}</td>
                  <td className="p-2.5 font-mono text-blue-800 font-bold">{loan.asset_serial_number || 'Belum discan'}</td>
                  <td className="p-2.5 text-right">
                    <span className="text-[10px] text-red-600 font-mono font-bold">
                      {loan.duration_days}hr · {dueDateFormatted}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="text-[11px] text-gray-500 italic">
              <b>Alasan:</b> "{loan.purpose}"
            </p>
          </div>

          {/* Tanda Tangan */}
          <div className="grid grid-cols-2 gap-6 text-center text-xs pt-4 border-t border-gray-200">
            <div>
              <p className="text-gray-500 font-semibold mb-8 text-[11px]">
                {isReturn ? 'Diserahkan Oleh (Toko)' : 'Diserahkan Oleh (IT)'}
              </p>
              <p className="font-bold underline text-gray-900 text-xs">
                {isReturn ? (loan.requested_by_name || 'Kepala Toko') : (loan.dispatched_by_name || 'Petugas IT')}
              </p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold mb-8 text-[11px]">
                {isReturn ? 'Diterima Oleh (IT)' : 'Diterima Oleh (Toko)'}
              </p>
              <p className="font-bold underline text-gray-900 text-xs">
                {isReturn ? 'Petugas Gudang IT' : (loan.received_by_name || loan.requested_by_name || 'Penerima Toko')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2">
          <Button variant="primary" icon="fa-print" onClick={handlePrint} fullWidth>
            Buka &amp; Cetak Dokumen
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </ModalShell>
  );
};

export default BASTDocumentModal;

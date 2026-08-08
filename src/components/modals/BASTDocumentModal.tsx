import React from 'react';
import type { AssetLoan } from '../../types/inventory';
import { ModalShell, Button } from '../ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  loan: AssetLoan | null;
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

  const dateFormatted = new Date(isReturn ? (loan.returned_at || Date.now()) : (loan.dispatched_at || loan.created_at)).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Dokumen Resmi BAST & Shipping Label"
        titleIcon="fa-file-contract"
        titleIconBg="bg-purple-500/20 text-purple-400"
      >
        <div className="space-y-4">
          {/* Instruksi Print untuk User */}
          <div className="no-print bg-blue-500/15 border border-blue-500/40 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-blue-200">
              <i className="fas fa-print text-blue-400 text-lg shrink-0" />
              <span>Dokumen BAST ini dapat Anda cetak langsung atau disimpan dalam format PDF beresolusi tinggi.</span>
            </div>
            <Button size="sm" variant="primary" icon="fa-print" onClick={handlePrint} className="shrink-0">
              Cetak / Save PDF
            </Button>
          </div>

          {/* AREA DOKUMEN BAST YANG SIAP DIPRINT */}
          <div className="bast-print-area bg-white text-gray-900 p-6 rounded-2xl border border-gray-300 shadow-2xl space-y-6 select-text">
            {/* Header / Kop Surat */}
            <div className="border-b-2 border-gray-900 pb-4 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-gray-900">TRANSIT TMA</h1>
                <p className="text-[11px] text-gray-600 font-semibold uppercase tracking-wider">
                  IT Asset & Device Logistics Management
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-gray-900 text-gray-50 text-xs font-bold font-mono rounded">
                  {loan.loan_code}
                </span>
                <p className="text-[11px] text-gray-600 mt-1 font-mono">Tanggal: {dateFormatted}</p>
              </div>
            </div>

            {/* Judul Dokumen */}
            <div className="text-center py-2 bg-gray-100 rounded-lg border border-gray-300">
              <h2 className="text-sm font-black uppercase text-gray-900 tracking-wide">{docTitle}</h2>
            </div>

            {/* Pihak Terkait */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Pihak 1 (Tim IT / Gudang):</span>
                <p className="text-sm font-bold text-gray-900">{loan.dispatched_by_name || 'Tim IT Support'}</p>
                <p className="text-gray-600 mt-0.5">Departemen: IT & Asset Logistics</p>
                <p className="text-gray-500 text-[11px]">Metode: {loan.shipping_method}</p>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Pihak 2 (Toko / Peminjam):</span>
                <p className="text-sm font-bold text-gray-900">{loan.requested_by_name} ({loan.site_alias})</p>
                <p className="text-gray-600 mt-0.5">Lokasi: {loan.site_name || loan.site_alias} ({loan.site_region || 'Indonesia'})</p>
                <p className="text-gray-500 text-[11px]">Resi/Tracking: {loan.tracking_number || '—'}</p>
              </div>
            </div>

            {/* Tabel Spesifikasi Aset */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase text-gray-800 tracking-wider">Rincian Unit Aset Yang Diserahterimakan:</h3>
              <div className="border border-gray-300 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-200 text-gray-800 font-bold border-b border-gray-300">
                      <th className="p-2.5">Kategori</th>
                      <th className="p-2.5">Brand & Model</th>
                      <th className="p-2.5">Serial Number / Aktiva</th>
                      <th className="p-2.5 text-right">Durasi & Jatuh Tempo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-medium">
                    <tr>
                      <td className="p-2.5 text-gray-900 font-bold">{loan.category_name}</td>
                      <td className="p-2.5">{loan.asset_brand || 'Aset'} — {loan.asset_model_type || ''}</td>
                      <td className="p-2.5 font-mono text-blue-900 font-bold">{loan.asset_serial_number || 'Belum discan IT'}</td>
                      <td className="p-2.5 text-right font-semibold">
                        {loan.duration_days} Hari <br />
                        <span className="text-[10px] text-red-600 font-mono">
                          Due: {new Date(loan.due_date).toLocaleDateString('id-ID')}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-600 italic">
                <b>Tujuan Penggunaan / Alasan:</b> "{loan.purpose}"
              </p>
            </div>

            {/* Syarat & Ketentuan Peminjaman */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
              <span className="font-bold block text-amber-950 uppercase text-[10px]">Syarat & Ketentuan Serah Terima:</span>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Unit tersebut di atas merupakan hak milik sah Perusahaan dan dipinjamkan khusus untuk mendukung kelancaran operasional Toko/Cabang.</li>
                <li>Pihak Penerima di Toko wajib merawat unit dengan baik serta menjaga keutuhan stiker barcode/serial number dan aksesoris pendukungnya.</li>
                <li>Unit wajib dikembalikan selambat-lambatnya pada tanggal jatuh tempo (<b>{loan.duration_days} hari sejak penyerahan</b>). Keterlambatan tanpa approval perpanjangan dari Tim IT akan dikenakan eskalasi ke Kepala Toko dan Area Manager.</li>
              </ul>
            </div>

            {/* Kolom Tanda Tangan */}
            <div className="pt-4 grid grid-cols-2 gap-8 text-center text-xs pb-4">
              <div>
                <p className="text-gray-600 font-semibold mb-16">
                  {isReturn ? 'Diserahkan Oleh (Peminjam Toko)' : 'Diserahkan Oleh (Tim IT / Gudang)'}
                </p>
                <p className="font-bold underline text-gray-900">
                  {isReturn ? (loan.requested_by_name || 'Kepala Toko') : (loan.dispatched_by_name || 'Petugas Gudang IT')}
                </p>
                <span className="text-[10px] text-gray-500">Tanggal: {dateFormatted}</span>
              </div>
              <div>
                <p className="text-gray-600 font-semibold mb-16">
                  {isReturn ? 'Diterima Oleh (Tim IT / Gudang)' : 'Diterima Oleh (Peminjam Toko)'}
                </p>
                <p className="font-bold underline text-gray-900">
                  {isReturn ? 'Petugas Gudang IT / Admin' : (loan.received_by_name || loan.requested_by_name || 'Penerima Toko')}
                </p>
                <span className="text-[10px] text-gray-500">Tanggal: {dateFormatted}</span>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="no-print pt-2 flex justify-end">
            <Button type="button" variant="secondary" onClick={onClose} fullWidth>
              Tutup Preview
            </Button>
          </div>
        </div>

        {/* Print Styles */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .bast-print-area, .bast-print-area * {
              visibility: visible;
            }
            .bast-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              border: none;
              box-shadow: none;
              border-radius: 0;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>
      </ModalShell>
    </>
  );
};

export default BASTDocumentModal;

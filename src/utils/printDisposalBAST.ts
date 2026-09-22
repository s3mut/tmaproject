import { printDocument } from './printDocument';

export interface BASTDisposalItem {
  aktiva: string;
  brand: string;
  model_type: string;
  serial_number: string;
  reason: string;
  location: string;
}

export interface PrintBASTDisposalParams {
  bastNo: string;
  disposalDate: string;
  processedBy: string;
  notes?: string;
  items: BASTDisposalItem[];
}

export function printDisposalBAST(params: PrintBASTDisposalParams): void {
  const { bastNo, disposalDate, processedBy, notes, items } = params;

  const html = `
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #0f172a; max-width: 800px; margin: 0 auto; padding: 10px;">
      
      <!-- Kop Header -->
      <div style="text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="font-size: 18px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; color: #0f172a; margin-bottom: 4px;">
          BERITA ACARA PEMUSNAHAN ASET TI
        </h2>
        <p style="font-size: 12px; color: #475569; font-weight: 600;">E1-TMA — IT Asset Inventory Management System</p>
        <div style="display: inline-block; margin-top: 8px; padding: 4px 12px; background: #f1f5f9; border-radius: 6px; font-size: 11px; font-family: monospace; font-weight: 700; color: #334155;">
          NO. BAST: ${bastNo} &nbsp;|&nbsp; TANGGAL: ${disposalDate}
        </div>
      </div>

      <!-- Keterangan Pembuka -->
      <p style="font-size: 12px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
        Pada hari ini, <strong>${disposalDate}</strong>, telah dilaksanakan verifikasi dan pemusnahan/penghapusan aset Teknologi Informasi (TI) dari daftar inventaris aktif dengan rincian unit sebagai berikut:
      </p>

      <!-- Tabel Daftar Pemusnahan Aset -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 11px;">
        <thead>
          <tr style="background-color: #1e293b; color: #ffffff; text-transform: uppercase;">
            <th style="border: 1px solid #334155; padding: 8px 6px; text-align: center; width: 30px;">NO</th>
            <th style="border: 1px solid #334155; padding: 8px 6px; width: 110px;">AKTIVA</th>
            <th style="border: 1px solid #334155; padding: 8px 6px; width: 90px;">MERK</th>
            <th style="border: 1px solid #334155; padding: 8px 6px; width: 110px;">TYPE</th>
            <th style="border: 1px solid #334155; padding: 8px 6px; width: 130px;">S/N</th>
            <th style="border: 1px solid #334155; padding: 8px 6px;">ALASAN PEMUSNAHAN</th>
            <th style="border: 1px solid #334155; padding: 8px 6px; width: 120px;">LOKASI</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, idx) => `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: 500;">${idx + 1}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px; font-family: monospace; color: #334155;">${item.aktiva || '—'}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px; font-weight: 700; color: #0f172a;">${item.brand || '—'}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px; color: #334155;">${item.model_type || '—'}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px; font-family: monospace; font-weight: 700; color: #0f172a;">${item.serial_number}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px; color: #991b1b; font-weight: 500;">${item.reason || 'Rusak Berat / Afkir'}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px; color: #334155;">${item.location}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      ${notes ? `
        <div style="background-color: #fffbe6; border: 1px solid #ffe58f; padding: 10px 14px; border-radius: 6px; margin-bottom: 20px; font-size: 11px; color: #7c5e10;">
          <strong>Catatan Tambahan:</strong> ${notes}
        </div>
      ` : ''}

      <!-- Penutup -->
      <p style="font-size: 11px; line-height: 1.5; color: #475569; margin-bottom: 30px;">
        Demikian Berita Acara Pemusnahan Aset TI ini dibuat dengan sebenarnya dalam rangkap yang cukup untuk dipergunakan sebagaimana mestinya sebagai bukti penonaktifan dan pemusnahan aset dari database inventaris resmi.
      </p>

      <!-- QR Code Validation & E-Sign Placeholder -->
      <div style="display: flex; justify-content: space-between; text-align: center; margin-top: 30px; page-break-inside: avoid;">
        <div style="width: 30%;">
          <p style="font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 10px;">Yang Mengajukan (Tim IT)</p>
          <!-- E-Sign Placeholder / QR -->
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=VALIDATION-${bastNo}&format=svg" alt="QR Code" style="width: 60px; height: 60px; margin-bottom: 10px; opacity: 0.8;" />
          <p style="font-size: 10px; color: #64748b; font-style: italic; margin-bottom: 10px;">[E-SIGN VALIDATED]</p>
          <p style="font-size: 12px; font-weight: 700; text-decoration: underline; color: #0f172a;">${processedBy}</p>
          <p style="font-size: 10px; color: #64748b; margin-top: 2px;">IT Staff / Officer</p>
        </div>
        <div style="width: 30%;">
          <p style="font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 60px;">Saksi Pemusnahan</p>
          <p style="font-size: 12px; font-weight: 700; text-decoration: underline; color: #0f172a;">( .................................... )</p>
          <p style="font-size: 10px; color: #64748b; margin-top: 2px;">Internal Audit / Security</p>
        </div>
        <div style="width: 30%;">
          <p style="font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 60px;">Mengetahui & Menyetujui</p>
          <p style="font-size: 12px; font-weight: 700; text-decoration: underline; color: #0f172a;">( .................................... )</p>
          <p style="font-size: 10px; color: #64748b; margin-top: 2px;">Head of IT / Operations Manager</p>
        </div>
      </div>

    </div>
  `;

  printDocument({
    title: `BAST_Pemusnahan_${bastNo.replace(/[^a-zA-Z0-9]/g, '_')}`,
    html,
    autoClose: false,
  });
}

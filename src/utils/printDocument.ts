/**
 * printDocument.ts
 * Reusable print utility — membuka popup window baru berisi HTML lengkap,
 * menerapkan CSS print-ready, lalu auto-trigger window.print().
 *
 * Cara pakai:
 *   import { printDocument } from '../utils/printDocument';
 *   printDocument({ title: 'BAST', html: '<div>...</div>', css: '...' });
 */

export interface PrintDocumentOptions {
  /** Judul tab browser (tampil di header print) */
  title?: string;
  /** HTML body content yang akan dicetak */
  html: string;
  /** CSS tambahan (opsional) — sudah ada base reset & font */
  css?: string;
  /** Apakah auto-close popup setelah print selesai (default: true) */
  autoClose?: boolean;
}

export function printDocument({
  title = 'Dokumen',
  html,
  css = '',
  autoClose = true,
}: PrintDocumentOptions): void {
  const printWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');

  if (!printWindow) {
    alert('Pop-up diblokir oleh browser. Harap izinkan pop-up untuk fitur cetak.');
    return;
  }

  const baseCss = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      color: #111827;
      background: #fff;
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    h1, h2, h3, h4 { line-height: 1.3; }

    table { border-collapse: collapse; width: 100%; }
    th, td { text-align: left; }

    @media print {
      body { padding: 0; margin: 0; }
      .no-print { display: none !important; }
      @page {
        size: A4;
        margin: 15mm 12mm;
      }
    }

    /* ── Toolbar (tidak ikut tercetak) ── */
    .print-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #1e293b;
      color: #f1f5f9;
      padding: 10px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .print-toolbar .btn-print {
      background: #3b82f6;
      color: #fff;
      border: none;
      padding: 6px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    .print-toolbar .btn-print:hover { background: #2563eb; }
  `;

  const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    ${baseCss}
    ${css}
  </style>
</head>
<body>
  <div class="print-toolbar no-print">
    <span>📄 ${title}</span>
    <button class="btn-print" onclick="window.print()">🖨️ Cetak / Save PDF</button>
  </div>
  ${html}
  <script>
    // Auto-print saat halaman selesai dimuat
    window.onload = function() {
      setTimeout(function() {
        window.print();
        ${autoClose ? "setTimeout(function(){ window.close(); }, 1000);" : ""}
      }, 400);
    };
  <\/script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(fullHtml);
  printWindow.document.close();
}

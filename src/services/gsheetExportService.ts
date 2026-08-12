import type { AssetDetail } from '../types/inventory';

export type DateFilterOption = 'all' | 'today' | '7days' | '30days';

export interface GSheetExportRow {
  external_id: string;
  serial_number: string;
  location: string;
  status: string;
  aktiva: string;
  category: string;
  description: string;
  updated_at: string;
}

/**
 * Filter assets based on updated_at timestamp filter
 */
export const filterAssetsByDate = (assets: AssetDetail[], filter: DateFilterOption): AssetDetail[] => {
  if (filter === 'all') return assets;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  return assets.filter(asset => {
    const rawDate = asset.updated_at || asset.created_at;
    if (!rawDate) return false;

    const assetDate = new Date(rawDate);
    if (isNaN(assetDate.getTime())) return false;

    if (filter === 'today') {
      return assetDate.toISOString().split('T')[0] === todayStr;
    }

    const diffDays = (now.getTime() - assetDate.getTime()) / (1000 * 3600 * 24);

    if (filter === '7days') {
      return diffDays <= 7;
    }

    if (filter === '30days') {
      return diffDays <= 30;
    }

    return true;
  });
};

/**
 * Maps asset objects to required Google Sheets schema rows
 */
export const mapAssetsToExportRows = (assets: AssetDetail[]): GSheetExportRow[] => {
  return assets.map(a => ({
    external_id: a.external_id || '',
    serial_number: a.serial_number || '',
    location: a.site_name ? `${a.site_name} (${a.site_alias || ''})` : (a.site_alias || '—'),
    status: a.status || 'Active',
    aktiva: a.aktiva || '',
    category: a.category_name || '',
    description: a.description || '',
    updated_at: a.updated_at ? new Date(a.updated_at).toLocaleString('id-ID') : '—',
  }));
};

/**
 * Sends export payload to Google Apps Script WebApp endpoint
 */
export const exportToGoogleSheetWebhook = async (webhookUrl: string, rows: GSheetExportRow[]): Promise<boolean> => {
  const url = webhookUrl.trim();
  if (!url) throw new Error('URL Webhook / Google Apps Script belum diisi!');
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('URL harus diawali dengan http:// atau https://');
  }

  const payload = {
    app: 'E1-TMA',
    timestamp: new Date().toISOString(),
    total_records: rows.length,
    data: rows,
  };

  // mode: 'no-cors' allows sending POST payload to Google Apps Script without CORS preflight block
  await fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  return true;
};

/**
 * Ready-to-copy Google Apps Script template for user's Google Sheet
 */
export const GOOGLE_APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var contents = JSON.parse(e.postData.contents);
    var data = contents.data || [];
    
    // Clear data sebelumnya & buat header
    sheet.clearContents();
    sheet.appendRow([
      "External ID",
      "Serial Number",
      "Lokasi / Site",
      "Status",
      "No. Aktiva",
      "Kategori",
      "Deskripsi",
      "Terakhir Diperbarui"
    ]);
    
    // Styling Header
    var headerRange = sheet.getRange(1, 1, 1, 8);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#1e293b");
    headerRange.setFontColor("#ffffff");
    
    // Append rows
    data.forEach(function(item) {
      sheet.appendRow([
        item.external_id || "",
        item.serial_number || "",
        item.location || "",
        item.status || "",
        item.aktiva || "",
        item.category || "",
        item.description || "",
        item.updated_at || ""
      ]);
    });
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", count: data.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

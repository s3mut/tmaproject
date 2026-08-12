import React, { useState, useEffect } from 'react';
import type { AssetDetail } from '../../types/inventory';
import { ModalShell, Button, Input, Select } from '../ui';
import {
  type DateFilterOption,
  filterAssetsByDate,
  mapAssetsToExportRows,
  exportToGoogleSheetWebhook,
  GOOGLE_APPS_SCRIPT_CODE,
} from '../../services/gsheetExportService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assets?: AssetDetail[];
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

const LOCAL_STORAGE_KEY = 'e1_tma_gsheet_url';

const ExportGSheetModal: React.FC<Props> = ({
  isOpen,
  onClose,
  assets = [],
  onShowToast,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [exporting, setExporting] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load saved Webhook URL from localStorage on mount/open
  useEffect(() => {
    if (isOpen) {
      const savedUrl = localStorage.getItem(LOCAL_STORAGE_KEY) || '';
      setWebhookUrl(savedUrl);
    }
  }, [isOpen]);

  const handleUrlChange = (val: string) => {
    setWebhookUrl(val);
    localStorage.setItem(LOCAL_STORAGE_KEY, val.trim());
  };

  const filteredAssets = filterAssetsByDate(assets, dateFilter);

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
      setCopied(true);
      if (onShowToast) onShowToast('📋 Kode Google Apps Script berhasil disalin!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      if (onShowToast) onShowToast('❌ Gagal menyalin kode. Silakan salin manual.', 'error');
    }
  };

  const handleExport = async () => {
    if (!webhookUrl.trim()) {
      if (onShowToast) onShowToast('⚠️ Masukkan Webhook / WebApp URL Google Sheet terlebih dahulu!', 'error');
      return;
    }

    if (filteredAssets.length === 0) {
      if (onShowToast) onShowToast('⚠️ Tidak ada data aset yang sesuai dengan filter waktu terpilih.', 'error');
      return;
    }

    try {
      setExporting(true);
      const rows = mapAssetsToExportRows(filteredAssets);
      await exportToGoogleSheetWebhook(webhookUrl, rows);
      
      if (onShowToast) {
        onShowToast(`✅ Berhasil mengirim ${rows.length} data aset ke Google Sheets!`, 'success');
      }
      onClose();
    } catch (err: any) {
      console.error('GSheet export error:', err);
      if (onShowToast) {
        onShowToast(`❌ Export gagal: ${err.message || 'Periksa kembali URL Webhook Anda'}`, 'error');
      }
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadCSV = () => {
    try {
      const rows = mapAssetsToExportRows(filteredAssets);
      const headers = ['External ID', 'Serial Number', 'Lokasi / Site', 'Status', 'No. Aktiva', 'Kategori', 'Deskripsi', 'Terakhir Diperbarui'];
      const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

      const csvLines = [
        headers.join(','),
        ...rows.map(r => [
          escapeCsv(r.external_id),
          escapeCsv(r.serial_number),
          escapeCsv(r.location),
          escapeCsv(r.status),
          escapeCsv(r.aktiva),
          escapeCsv(r.category),
          escapeCsv(r.description),
          escapeCsv(r.updated_at),
        ].join(',')),
      ].join('\n');

      const blob = new Blob([csvLines], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `e1-tma-inventory-${dateFilter}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (onShowToast) onShowToast('✅ CSV berhasil di-download!', 'success');
    } catch (e: any) {
      if (onShowToast) onShowToast(`❌ Gagal download CSV: ${e.message}`, 'error');
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Export ke Google Sheets"
      titleIcon="fa-file-excel"
      titleIconBg="bg-emerald-500/20 text-emerald-400"
    >
      <div className="space-y-4">
        {/* Webhook URL Input */}
        <Input
          label="Link / URL Google Apps Script WebApp"
          placeholder="https://script.google.com/macros/s/.../exec"
          value={webhookUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          hint="Link WebApp Google Apps Script dari spreadsheet Anda"
        />

        {/* Smart URL Detector Alert */}
        {webhookUrl.includes('docs.google.com/spreadsheets') && !webhookUrl.includes('script.google.com') && (
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
            <i className="fas fa-triangle-exclamation text-amber-400 mt-0.5" />
            <div>
              <strong className="block text-amber-200">Perhatian Link Google Sheet:</strong>
              Link yang dimasukkan adalah URL file Spreadsheet. Untuk auto-sync, pastikan menempelkan <strong>Web App URL</strong> dari hasil Deploy Apps Script (yang diawali <code>https://script.google.com/macros/s/.../exec</code>). Lihat petunjuk di bawah.
            </div>
          </div>
        )}

        {/* Filter Dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Filter Rentang Waktu Update"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilterOption)}
          >
            <option value="all">Semua Data Aset (Full Snapshot)</option>
            <option value="today">Diperbarui Hari Ini</option>
            <option value="7days">Diperbarui 7 Hari Terakhir</option>
            <option value="30days">Diperbarui 30 Hari Terakhir</option>
          </Select>

          {/* Record Count Badge */}
          <div className="flex flex-col justify-end">
            <div className="glass rounded-xl p-3 flex items-center justify-between border border-emerald-500/30 bg-emerald-500/10">
              <span className="text-xs text-slate-300">Total Aset Diekspor:</span>
              <span className="text-sm font-bold text-emerald-400">
                {filteredAssets.length} <span className="text-xs font-normal text-slate-400">Unit</span>
              </span>
            </div>
          </div>
        </div>

        {/* Expandable Setup Instructions */}
        <div className="glass rounded-xl p-3 border border-slate-700/60">
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="w-full flex items-center justify-between text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <i className="fas fa-circle-info"></i>
              Cara Menyiapkan Google Sheet (1-Klik Setup)
            </span>
            <i className={`fas fa-chevron-${showGuide ? 'up' : 'down'} text-[10px]`}></i>
          </button>

          {showGuide && (
            <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-2 text-xs text-slate-300">
              <p className="font-semibold text-slate-200">Langkah mudah menghubungkan Google Sheet:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
                <li>Buka Google Sheet Anda $\rightarrow$ Pilih menu <strong className="text-slate-200">Extensions / Ekstensi</strong> $\rightarrow$ <strong className="text-slate-200">Apps Script</strong>.</li>
                <li>Hapus kode bawaan, lalu paste kode Script E1-TMA (klik tombol di bawah).</li>
                <li>Klik <strong className="text-slate-200">Deploy / Terapkan</strong> $\rightarrow$ <strong className="text-slate-200">New Deployment</strong>.</li>
                <li>Pilih type: <strong className="text-slate-200">Web app</strong>, Who has access: <strong className="text-slate-200">Anyone / Siapa Saja</strong>.</li>
                <li>Salin <strong className="text-slate-200">Web App URL</strong> yang dihasilkan ke kolom input di atas.</li>
              </ol>

              <button
                type="button"
                onClick={handleCopyScript}
                className="w-full mt-2 py-2 px-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <i className={`fas ${copied ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
                {copied ? 'Kode Berhasil Disalin!' : 'Salin Kode Google Apps Script'}
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleDownloadCSV}
            icon="fa-download"
          >
            Download CSV
          </Button>
          <Button
            type="button"
            variant="success"
            fullWidth
            loading={exporting}
            onClick={handleExport}
            icon="fa-file-excel"
          >
            Export ke Google Sheets
          </Button>
        </div>
      </div>
    </ModalShell>
  );
};

export default ExportGSheetModal;

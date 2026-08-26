import React, { useState, useEffect, useMemo } from 'react';
import type { AssetDetail } from '../../types/inventory';
import { ModalShell, Button, Input, Textarea } from '../ui';
import { bulkDisposeAssets } from '../../services/assetService';
import { exportDisposalToGoogleSheetWebhook } from '../../services/gsheetExportService';
import { printDisposalBAST } from '../../utils/printDisposalBAST';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assets?: AssetDetail[];
  currentUserId?: number;
  currentUserName?: string;
  onSuccess?: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

interface DisposalItemEntry {
  asset: AssetDetail;
  reason: string;
}

const LOCAL_STORAGE_KEY = 'e1_tma_gsheet_url';

const BulkDisposalModal: React.FC<Props> = ({
  isOpen,
  onClose,
  assets = [],
  currentUserId = 0,
  currentUserName = 'Tim IT',
  onSuccess,
  onShowToast,
}) => {
  const [bastNo, setBastNo] = useState('');
  const [disposalDate, setDisposalDate] = useState('');
  const [globalReason, setGlobalReason] = useState('Kerusakan Fisik Berat / Afkir');
  const [notes, setNotes] = useState('');
  const [selectedEntries, setSelectedEntries] = useState<DisposalItemEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncGSheet, setSyncGSheet] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasWebhookUrl, setHasWebhookUrl] = useState(false);

  // Generate default BAST number & today date on modal open
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const randomSeq = String(Math.floor(100 + Math.random() * 900));

      setBastNo(`BAST-DISP/${year}${month}${day}/${randomSeq}`);
      
      const formattedDate = now.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'Long' as any,
        year: 'numeric'
      });
      setDisposalDate(formattedDate);

      const savedUrl = localStorage.getItem(LOCAL_STORAGE_KEY) || '';
      setHasWebhookUrl(!!savedUrl.trim());
    } else {
      setSelectedEntries([]);
      setSearchQuery('');
    }
  }, [isOpen]);

  // Filter available assets for search selection (prioritize Retired / Repair assets)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase().trim();
    const selectedIds = new Set(selectedEntries.map(e => e.asset.id));

    return assets
      .filter(a => {
        if (selectedIds.has(a.id)) return false;
        if (a.status === 'Disposed') return false; // Abaikan yang sudah musnah

        return (
          a.serial_number.toLowerCase().includes(query) ||
          (a.aktiva || '').toLowerCase().includes(query) ||
          (a.brand || '').toLowerCase().includes(query) ||
          (a.model_type || '').toLowerCase().includes(query) ||
          (a.site_alias || '').toLowerCase().includes(query) ||
          (a.site_name || '').toLowerCase().includes(query)
        );
      })
      .slice(0, 10);
  }, [assets, searchQuery, selectedEntries]);

  const handleAddAsset = (asset: AssetDetail) => {
    setSelectedEntries(prev => [...prev, { asset, reason: globalReason }]);
    setSearchQuery('');
  };

  const handleRemoveAsset = (assetId: number) => {
    setSelectedEntries(prev => prev.filter(e => e.asset.id !== assetId));
  };

  const handleReasonChange = (assetId: number, newReason: string) => {
    setSelectedEntries(prev =>
      prev.map(e => (e.asset.id === assetId ? { ...e, reason: newReason } : e))
    );
  };

  const handleApplyGlobalReason = () => {
    setSelectedEntries(prev => prev.map(e => ({ ...e, reason: globalReason })));
    if (onShowToast) onShowToast('✅ Alasan pemusnahan diperbarui ke semua item terpilih!', 'success');
  };

  const handleExecuteDisposal = async () => {
    if (selectedEntries.length === 0) {
      if (onShowToast) onShowToast('⚠️ Pilih minimal 1 unit aset yang akan dimusnahkan!', 'error');
      return;
    }

    if (!bastNo.trim()) {
      if (onShowToast) onShowToast('⚠️ Nomor BAST Pemusnahan harus diisi!', 'error');
      return;
    }

    try {
      setSubmitting(true);

      // 1. Prepare items for BAST & Google Sheet
      const disposalItems = selectedEntries.map(e => ({
        aktiva: e.asset.aktiva || '—',
        brand: e.asset.brand || '—',
        model_type: e.asset.model_type || '—',
        serial_number: e.asset.serial_number,
        reason: e.reason.trim() || globalReason,
        location: e.asset.site_name ? `${e.asset.site_name} (${e.asset.site_alias || ''})` : (e.asset.site_alias || '—'),
      }));

      // 2. Batch status update to 'Disposed' in database
      const dbPayload = selectedEntries.map(e => ({
        assetId: e.asset.id,
        reason: e.reason.trim() || globalReason,
      }));
      await bulkDisposeAssets(dbPayload, currentUserId);

      // 3. Auto-sync to Google Sheet tab 'BAST-Ei' if enabled
      let gsheetSynced = false;
      const webhookUrl = localStorage.getItem(LOCAL_STORAGE_KEY) || '';
      if (syncGSheet && webhookUrl.trim()) {
        try {
          await exportDisposalToGoogleSheetWebhook(webhookUrl, {
            bastNo,
            disposalDate,
            processedBy: currentUserName,
            items: disposalItems,
          });
          gsheetSynced = true;
        } catch (err: any) {
          console.warn('GSheet disposal append failed:', err);
        }
      }

      // 4. Trigger BAST Pemusnahan Print Document
      printDisposalBAST({
        bastNo,
        disposalDate,
        processedBy: currentUserName,
        notes,
        items: disposalItems,
      });

      if (onShowToast) {
        onShowToast(
          `✅ Pemusnahan ${selectedEntries.length} aset berhasil diproses! ${
            gsheetSynced ? '(Tersinkron ke Google Sheet BAST-Ei)' : ''
          }`,
          'success'
        );
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Bulk disposal error:', err);
      if (onShowToast) onShowToast(`❌ Gagal memproses pemusnahan: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportDraftCSV = () => {
    if (selectedEntries.length === 0) {
      if (onShowToast) onShowToast('⚠️ Pilih minimal 1 unit aset untuk diexport!', 'error');
      return;
    }
    try {
      const headers = ['No', 'Nomor Aktiva', 'Merk / Type', 'Serial Number', 'Alasan Usulan Pemusnahan', 'Lokasi'].join(',');
      const rows = selectedEntries.map((e, idx) => [
        idx + 1,
        `"${e.asset.aktiva || ''}"`,
        `"${e.asset.brand || ''} ${e.asset.model_type || ''}"`,
        `"${e.asset.serial_number}"`,
        `"${e.reason.trim() || globalReason}"`,
        `"${e.asset.site_alias || e.asset.site_name || ''}"`
      ].join(','));
      
      const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Usulan-Pemusnahan-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      if (onShowToast) onShowToast('✅ CSV Usulan Pemusnahan berhasil diunduh!', 'success');
    } catch (err: any) {
      console.error('Export CSV Error:', err);
      if (onShowToast) onShowToast(`❌ Gagal export CSV: ${err.message}`, 'error');
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Pemusnahan Massal & BAST"
      titleIcon="fa-fire-alt"
      titleIconBg="bg-red-500/20 text-red-400"
    >
      <div className="space-y-4">
        {/* Top Meta Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Nomor BAST Pemusnahan"
            value={bastNo}
            onChange={e => setBastNo(e.target.value)}
            required
          />
          <Input
            label="Tanggal Pemusnahan"
            value={disposalDate}
            onChange={e => setDisposalDate(e.target.value)}
            required
          />
        </div>

        {/* Global Reason Input */}
        <div className="glass rounded-xl p-3 space-y-2 border border-slate-700/60">
          <label className="block text-xs font-semibold text-slate-300">
            Alasan Pemusnahan Standar
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={globalReason}
              onChange={e => setGlobalReason(e.target.value)}
              className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-blue-500"
              placeholder="Contoh: Kerusakan Fisik Berat / Afkir"
            />
            <button
              type="button"
              onClick={handleApplyGlobalReason}
              className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-slate-200 transition-all"
            >
              Terapkan Semua
            </button>
          </div>
        </div>

        {/* Search Asset to Add */}
        <div className="space-y-2">
          <Input
            label="Cari & Tambah Aset ke Daftar Pemusnahan"
            placeholder="Ketik S/N, No. Aktiva, Brand, Model, atau Lokasi..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            icon="fa-search"
          />

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="glass rounded-xl p-2 max-h-48 overflow-y-auto space-y-1 border border-blue-500/30">
              {searchResults.map(a => (
                <div
                  key={a.id}
                  onClick={() => handleAddAsset(a)}
                  className="p-2 rounded-lg hover:bg-blue-500/20 cursor-pointer flex items-center justify-between transition-colors text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-100 mr-2">{a.serial_number}</span>
                    <span className="text-slate-400">{a.brand} {a.model_type}</span>
                    {a.aktiva && <span className="ml-2 text-blue-400 font-mono">[{a.aktiva}]</span>}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {a.site_alias || a.site_name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Items Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">
              Daftar Aset Terpilih ({selectedEntries.length} Unit)
            </span>
            {selectedEntries.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedEntries([])}
                className="text-[11px] text-red-400 hover:text-red-300 font-medium"
              >
                Kosongkan Semua
              </button>
            )}
          </div>

          {selectedEntries.length === 0 ? (
            <div className="p-6 text-center glass rounded-xl border border-dashed border-slate-700">
              <i className="fas fa-box-open text-2xl text-slate-600 mb-2 block" />
              <p className="text-xs text-slate-400">Belum ada aset yang dipilih.</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Gunakan kolom pencarian di atas untuk menambahkan unit.</p>
            </div>
          ) : (
            <div className="glass rounded-xl overflow-x-auto max-h-64 overflow-y-auto border border-slate-700/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="p-2.5">No</th>
                    <th className="p-2.5">Aktiva</th>
                    <th className="p-2.5">Merk / Type</th>
                    <th className="p-2.5">S/N</th>
                    <th className="p-2.5">Alasan Pemusnahan</th>
                    <th className="p-2.5">Lokasi</th>
                    <th className="p-2.5 text-center">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {selectedEntries.map((e, idx) => (
                    <tr key={e.asset.id} className="hover:bg-slate-800/40">
                      <td className="p-2.5 text-center text-slate-500">{idx + 1}</td>
                      <td className="p-2.5 font-mono text-slate-300">{e.asset.aktiva || '—'}</td>
                      <td className="p-2.5 font-medium">{e.asset.brand} {e.asset.model_type}</td>
                      <td className="p-2.5 font-mono text-blue-400 font-bold">{e.asset.serial_number}</td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={e.reason}
                          onChange={ev => handleReasonChange(e.asset.id, ev.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-red-300 outline-none focus:border-red-500"
                        />
                      </td>
                      <td className="p-2.5 text-slate-400">{e.asset.site_alias || e.asset.site_name}</td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveAsset(e.asset.id)}
                          className="text-slate-500 hover:text-red-400 p-1"
                        >
                          <i className="fas fa-times" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Additional Notes */}
        <Textarea
          label="Catatan Pemusnahan (Opsional)"
          placeholder="Nomor dokumen pendukung, nama penanggung jawab, dll..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        {/* Google Sheet Sync Option */}
        <div className="glass rounded-xl p-3 flex items-center justify-between border border-emerald-500/20 bg-emerald-500/5">
          <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={syncGSheet}
              onChange={e => setSyncGSheet(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
            />
            <span>Sync otomatis ke Google Sheets (Tab <strong className="text-emerald-400">BAST-Ei</strong>)</span>
          </label>

          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${hasWebhookUrl ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'}`}>
            {hasWebhookUrl ? 'Webhook Ready' : 'URL Belum Set'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          {selectedEntries.length > 0 && (
            <Button
              type="button"
              variant="primary"
              fullWidth
              onClick={handleExportDraftCSV}
              icon="fa-file-csv"
            >
              Export Daftar Usulan (CSV Excel)
            </Button>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" fullWidth onClick={onClose}>
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              fullWidth
              loading={submitting}
              disabled={selectedEntries.length === 0}
              onClick={handleExecuteDisposal}
              icon="fa-print"
            >
              Proses & Cetak BAST ({selectedEntries.length})
            </Button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

export default BulkDisposalModal;

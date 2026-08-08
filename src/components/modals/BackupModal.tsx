import React from 'react';
import type { AssetDetail, MutationDetail, Site, Category } from '../../types/inventory';
import { ModalShell, Button } from '../ui';

interface Props {
  isOpen:      boolean;
  onClose:     () => void;
  assets?:     AssetDetail[];
  mutations?:  MutationDetail[];
  sites?:      Site[];
  categories?: Category[];
  adminName?:  string;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

const escapeCsv = (val: any) => {
  if (val == null) return '';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * BackupModal — Admin-only disaster recovery and reporting export modal.
 * Built with atomic UI Design System components.
 */
const BackupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  assets = [],
  mutations = [],
  sites = [],
  categories = [],
  adminName,
  onShowToast,
}) => {
  const dateStr = new Date().toISOString().split('T')[0];

  const handleExportJSON = () => {
    try {
      const backupObject = {
        metadata: {
          system: 'TransitTMA - IT Asset Inventory',
          version: '1.0',
          timestamp: new Date().toISOString(),
          exported_by_admin: adminName || 'Administrator',
          record_counts: {
            assets: assets.length,
            mutations: mutations.length,
            sites: sites.length,
            categories: categories.length,
          },
        },
        data: {
          assets,
          mutations,
          sites,
          categories,
        },
      };

      const jsonContent = JSON.stringify(backupObject, null, 2);
      downloadFile(jsonContent, `transittma-backup-${dateStr}.json`, 'application/json;charset=utf-8;');
      if (onShowToast) onShowToast('✅ Backup JSON berhasil disimpan!', 'success');
    } catch (e: any) {
      if (onShowToast) onShowToast(`❌ Gagal download backup: ${e.message}`, 'error');
    }
  };

  const handleExportAssetsCSV = () => {
    try {
      const headers = [
        'Serial Number',
        'No Aktiva',
        'Brand',
        'Model / Type',
        'Computer Name',
        'Site Alias',
        'Nama Site',
        'Kategori',
        'Status',
        'External ID',
        'Deskripsi',
      ].join(',');

      const rows = assets.map((a) =>
        [
          escapeCsv(a.serial_number),
          escapeCsv(a.aktiva || ''),
          escapeCsv(a.brand || ''),
          escapeCsv(a.model_type || ''),
          escapeCsv(a.computer_name || ''),
          escapeCsv(a.site_alias || ''),
          escapeCsv(a.site_name || ''),
          escapeCsv(a.category_name || ''),
          escapeCsv(a.status),
          escapeCsv(a.external_id || ''),
          escapeCsv(a.description || ''),
        ].join(',')
      );

      // UTF-8 BOM agar langsung kompatibel di Microsoft Excel
      const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
      downloadFile(csvContent, `transittma-master-assets-${dateStr}.csv`, 'text/csv;charset=utf-8;');
      if (onShowToast) onShowToast('✅ CSV Master Aset berhasil diunduh!', 'success');
    } catch (e: any) {
      if (onShowToast) onShowToast(`❌ Gagal export CSV: ${e.message}`, 'error');
    }
  };

  const handleExportMutationsCSV = () => {
    try {
      const headers = [
        'ID Mutasi',
        'Serial Number Aset',
        'Brand Aset',
        'Model Aset',
        'Dari Site',
        'Ke Site (Kode)',
        'Ke Site (Nama)',
        'Status',
        'Dibuat Oleh',
        'Disetujui Oleh',
        'Catatan',
        'Tanggal Mutasi',
      ].join(',');

      const rows = mutations.map((m) =>
        [
          escapeCsv(m.id),
          escapeCsv(m.asset_serial_number || ''),
          escapeCsv(m.asset_brand || ''),
          escapeCsv(m.asset_model_type || ''),
          escapeCsv(m.from_site_name || m.from_site_code || ''),
          escapeCsv(m.to_site_code || ''),
          escapeCsv(m.to_site_name || ''),
          escapeCsv(m.status),
          escapeCsv(m.moved_by_name || ''),
          escapeCsv(m.received_by_name || ''),
          escapeCsv(m.notes || ''),
          escapeCsv(m.mutation_date || ''),
        ].join(',')
      );

      const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
      downloadFile(csvContent, `transittma-mutations-history-${dateStr}.csv`, 'text/csv;charset=utf-8;');
      if (onShowToast) onShowToast('✅ CSV Riwayat Mutasi berhasil diunduh!', 'success');
    } catch (e: any) {
      if (onShowToast) onShowToast(`❌ Gagal export CSV: ${e.message}`, 'error');
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Backup & Export Data (Admin)"
      titleIcon="fa-database"
      titleIconBg="bg-amber-500/20 text-amber-400"
    >
      <div className="space-y-5">
        {/* Info Box */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3">
          <i className="fas fa-shield-alt text-amber-400 text-lg mt-0.5" />
          <div className="text-xs text-amber-200/90 leading-relaxed">
            <span className="font-bold block text-amber-400 mb-0.5">Otoritas Khusus Admin IT</span>
            Anda dapat mengunduh salinan lengkap (snapshot) database inventaris atau mengimpor/mengolah kembali tabel Master Aset ke format Excel CSV.
          </div>
        </div>

        {/* Record Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="glass rounded-xl p-3 border border-slate-700/60">
            <p className="text-xs text-slate-400 mb-1">Master Aset</p>
            <p className="text-base font-bold text-slate-50">{assets.length}</p>
          </div>
          <div className="glass rounded-xl p-3 border border-slate-700/60">
            <p className="text-xs text-slate-400 mb-1">Log Mutasi</p>
            <p className="text-base font-bold text-blue-400">{mutations.length}</p>
          </div>
          <div className="glass rounded-xl p-3 border border-slate-700/60">
            <p className="text-xs text-slate-400 mb-1">Lokasi Site</p>
            <p className="text-base font-bold text-emerald-400">{sites.length}</p>
          </div>
        </div>

        {/* Action Options */}
        <div className="space-y-3 pt-1">
          {/* Option 1: Full JSON Backup */}
          <div className="glass rounded-xl p-3.5 border border-slate-700/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <i className="fas fa-file-code text-lg" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-50">Full Backup Snapshot</p>
                <p className="text-xs text-slate-400">Format JSON (Seluruh Aset, Mutasi, Site & Kategori)</p>
              </div>
            </div>
            <Button variant="primary" size="sm" icon="fa-download" onClick={handleExportJSON}>
              JSON
            </Button>
          </div>

          {/* Option 2: Assets Master CSV */}
          <div className="glass rounded-xl p-3.5 border border-slate-700/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <i className="fas fa-file-csv text-lg" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-50">Export Master Aset</p>
                <p className="text-xs text-slate-400">Format CSV (Siap Buka di Microsoft Excel / Upload)</p>
              </div>
            </div>
            <Button variant="success" size="sm" icon="fa-download" onClick={handleExportAssetsCSV}>
              CSV
            </Button>
          </div>

          {/* Option 3: Mutations CSV */}
          <div className="glass rounded-xl p-3.5 border border-slate-700/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <i className="fas fa-history text-lg" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-50">Export Riwayat Mutasi</p>
                <p className="text-xs text-slate-400">Format CSV (Audit trail & perpindahan barang)</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" icon="fa-download" onClick={handleExportMutationsCSV}>
              CSV
            </Button>
          </div>
        </div>

        {/* Close button */}
        <div className="pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </ModalShell>
  );
};

export default BackupModal;

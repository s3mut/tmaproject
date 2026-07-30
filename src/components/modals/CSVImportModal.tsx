import { useState, useRef } from 'react';
import type { Category } from '../../types/inventory';
import { parseCSVText, uploadValidatedCSVAssets, createCategoryFromAdmin, type CSVParseResult, type CSVRowParsed } from '../../services/csvImportService';

interface Props {
  isOpen: boolean;
  userRole: string;
  categories: Category[];
  onClose: () => void;
  onSuccess: (count: number) => void;
}

const CSVImportModal = ({ isOpen, userRole, categories: initialCategories, onClose, onSuccess }: Props) => {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [remapRules, setRemapRules] = useState<Record<string, number>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync categories prop saat categories di parent berubah
  if (categories !== initialCategories && initialCategories.length !== categories.length) {
    setCategories(initialCategories);
  }

  if (!isOpen) return null;

  // Proteksi Akses Hanya untuk Role Admin
  if (userRole !== 'admin') {
    return (
      <div className="modal-overlay active" onClick={onClose}>
        <div className="modal-content p-6 max-w-md mx-auto text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto text-2xl">
            <i className="fas fa-lock"></i>
          </div>
          <h2 className="text-lg font-bold text-white">Akses Ditolak</h2>
          <p className="text-sm text-slate-400">
            Hanya grup <strong className="text-slate-200">Admin</strong> yang memiliki wewenang untuk mengunggah data CSV.
          </p>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-slate-700 text-slate-300 text-sm font-medium">
            Tutup
          </button>
        </div>
      </div>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setErrorMsg('File harus berformat CSV (.csv)');
      return;
    }

    setFile(selectedFile);
    try {
      const text = await selectedFile.text();
      const result = parseCSVText(text, categories);
      setParseResult(result);
      setRemapRules({});
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membaca file CSV.');
      setParseResult(null);
    }
  };

  const handleRemapChange = (unknownCat: string, newCatId: number) => {
    setRemapRules(prev => ({
      ...prev,
      [unknownCat]: newCatId
    }));
  };

  const handleCreateCategory = async (catName: string) => {
    setAddingCategory(catName);
    setErrorMsg(null);
    try {
      const newCat = await createCategoryFromAdmin(catName);
      const updatedCategories = [...categories, newCat];
      setCategories(updatedCategories);

      // Re-parse CSV dengan daftar kategori terbaru
      if (file) {
        const text = await file.text();
        const result = parseCSVText(text, updatedCategories);
        setParseResult(result);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menambahkan kategori baru.');
    } finally {
      setAddingCategory(null);
    }
  };

  // Re-calculate valid rows considering remap rules
  const getFinalRowsToUpload = (): CSVRowParsed[] => {
    if (!parseResult) return [];

    const finalValid: CSVRowParsed[] = [...parseResult.validRows];

    // Check invalid rows to see if any have been remapped
    parseResult.invalidRows.forEach(row => {
      const remappedCatId = remapRules[row.category_input];
      if (remappedCatId) {
        const catObj = categories.find(c => c.id === Number(remappedCatId));
        if (catObj) {
          finalValid.push({
            ...row,
            isValid: true,
            category_id: catObj.id,
            category_matched_name: catObj.name,
            errorMsg: undefined
          });
        }
      }
    });

    return finalValid;
  };

  const finalRows = getFinalRowsToUpload();
  const unhandledUnknownCats = parseResult ? parseResult.unknownCategories.filter(cat => !remapRules[cat]) : [];

  const handleUploadSubmit = async () => {
    if (finalRows.length === 0) {
      setErrorMsg('Tidak ada data valid yang siap di-upload.');
      return;
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: finalRows.length });
    setErrorMsg(null);

    try {
      const res = await uploadValidatedCSVAssets(finalRows, (processed, total) => {
        setUploadProgress({ current: processed, total });
      });
      onSuccess(res.count);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat upload data.');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const resetModal = () => {
    setFile(null);
    setParseResult(null);
    setRemapRules({});
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content p-6 max-w-xl mx-auto space-y-5 max-h-[90vh] overflow-y-auto scrollbar-hide">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <i className="fas fa-file-csv text-lg"></i>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Import CSV Master Assets</h2>
              <p className="text-xs text-slate-400">Grup Admin • Validasi Strict Kategori</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <i className="fas fa-exclamation-triangle text-base"></i>
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {/* Form Upload File */}
        {!parseResult ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-700 hover:border-blue-500/50 rounded-2xl p-8 text-center bg-slate-800/30 transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <i className="fas fa-cloud-upload-alt text-4xl text-blue-400 mb-3 block"></i>
              <p className="text-sm font-medium text-slate-200">Pilih atau Seret File CSV ke Sini</p>
              <p className="text-xs text-slate-500 mt-1">Pastikan file memiliki header: serial_number, category, brand, dll.</p>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-3.5 text-xs text-slate-400 space-y-1.5">
              <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                <i className="fas fa-shield-alt text-emerald-400"></i> Proteksi Validasi Kategori:
              </p>
              <p>• Data unit dengan kategori typo/tidak dikenal akan **ditahan** untuk verifikasi Admin.</p>
              <p>• Hanya data dengan kategori yang valid yang akan di-upload ke database.</p>
            </div>
          </div>
        ) : (
          /* Hasil Parsing & Ringkasan Validasi */
          <div className="space-y-4">
            {/* Stat Bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800 p-3 rounded-xl text-center border border-slate-700">
                <p className="text-xs text-slate-400">Total di CSV</p>
                <p className="text-lg font-bold text-white">{parseResult.total}</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-center">
                <p className="text-xs text-emerald-400">Valid Siap Upload</p>
                <p className="text-lg font-bold text-emerald-400">{finalRows.length}</p>
              </div>
              <div className={`p-3 rounded-xl text-center border ${unhandledUnknownCats.length > 0 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                <p className="text-xs">Perlu Verifikasi</p>
                <p className="text-lg font-bold">{unhandledUnknownCats.length}</p>
              </div>
            </div>

            {/* List Kategori Typo / Tidak Dikenal */}
            {parseResult.unknownCategories.length > 0 && (
              <div className="bg-slate-800/80 border border-amber-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                  <i className="fas fa-exclamation-circle text-sm"></i>
                  <span>Ditemukan {parseResult.unknownCategories.length} Nama Kategori Belum Terdaftar:</span>
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {parseResult.unknownCategories.map((unknownCat) => {
                    const count = parseResult.invalidRows.filter(r => r.category_input === unknownCat).length;
                    const selectedRemap = remapRules[unknownCat] || '';

                    return (
                      <div key={unknownCat} className="bg-slate-900/90 p-3 rounded-lg flex flex-col gap-2 text-xs border border-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-amber-300 font-semibold px-2 py-0.5 bg-amber-500/10 rounded">
                            "{unknownCat}" ({count} unit)
                          </span>
                          <button
                            type="button"
                            disabled={addingCategory === unknownCat}
                            onClick={() => handleCreateCategory(unknownCat)}
                            className="px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 font-medium transition-all text-[11px] flex items-center gap-1"
                          >
                            {addingCategory === unknownCat ? (
                              <i className="fas fa-spinner fa-spin"></i>
                            ) : (
                              <>
                                <i className="fas fa-plus"></i> Buat Kategori Ini
                              </>
                            )}
                          </button>
                        </div>

                        {/* Remap Option */}
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 shrink-0">Atau hubungkan ke:</span>
                          <select
                            value={selectedRemap}
                            onChange={(e) => handleRemapChange(unknownCat, Number(e.target.value))}
                            className="form-input py-1 text-xs w-full rounded bg-slate-800 text-slate-200 border-slate-700"
                          >
                            <option value="">-- Pilih Kategori yang Sudah Ada --</option>
                            {categories.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={resetModal}
                className="py-2.5 px-4 rounded-xl bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Ganti File
              </button>
              <button
                type="button"
                onClick={handleUploadSubmit}
                disabled={uploading || finalRows.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Mengunggah {uploadProgress ? `${uploadProgress.current} / ${uploadProgress.total}` : ''}...
                  </>
                ) : (
                  <>
                    <i className="fas fa-file-import"></i> Upload {finalRows.length} Unit Valid
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CSVImportModal;

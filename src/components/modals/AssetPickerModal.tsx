import { useState, useMemo } from 'react';
import type { AssetDetail } from '../../types/inventory';
import { ModalShell, Input, EmptyState } from '../ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assets: AssetDetail[];
  categoryId: number | null;
  lockedAssetIds: Set<number>;
  onSelect: (assetId: number) => void;
}

const AssetPickerModal = ({ isOpen, onClose, assets, categoryId, lockedAssetIds, onSelect }: Props) => {
  const [search, setSearch] = useState('');

  const availableAssets = useMemo(() => {
    if (!categoryId) return [];
    return assets.filter(a => 
      a.status === 'Backup' && 
      a.category_id === categoryId && 
      !lockedAssetIds.has(a.id)
    );
  }, [assets, categoryId, lockedAssetIds]);

  const filteredAssets = useMemo(() => {
    const query = search.toLowerCase();
    return availableAssets.filter(a => 
      (a.serial_number && a.serial_number.toLowerCase().includes(query)) ||
      (a.brand && a.brand.toLowerCase().includes(query)) ||
      (a.model_type && a.model_type.toLowerCase().includes(query)) ||
      (a.site_alias && a.site_alias.toLowerCase().includes(query))
    );
  }, [availableAssets, search]);

  if (!isOpen) return null;

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Pilih Unit yang Akan Dikirim">
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Transaksi ini belum memiliki spesifik unit yang di-binding. Silakan pilih satu unit berstatus <strong className="text-emerald-400">Backup/Ready</strong> untuk diserahkan.
        </p>

        <Input
          placeholder="Cari S/N, Brand, Model, Lokasi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon="fa-search"
        />

        <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
          {filteredAssets.length > 0 ? (
            filteredAssets.map(asset => (
              <div 
                key={asset.id}
                onClick={() => onSelect(asset.id)}
                className="p-3 bg-slate-800/80 border border-slate-700/50 rounded-xl hover:border-blue-500 hover:bg-slate-700 cursor-pointer transition-colors flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold text-slate-200 font-mono text-sm">{asset.serial_number || 'Tanpa S/N'}</p>
                  <p className="text-xs text-slate-400 mt-1">{asset.brand} {asset.model_type}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">
                    <i className="fas fa-map-marker-alt mr-1"></i>
                    {asset.site_alias || 'Unknown'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              icon="fa-box-open"
              title="Tidak Ada Unit"
              description={
                availableAssets.length === 0 
                ? "Tidak ada unit Backup yang tersedia untuk kategori ini." 
                : "Tidak ada unit yang cocok dengan pencarian Anda."
              }
            />
          )}
        </div>
      </div>
    </ModalShell>
  );
};

export default AssetPickerModal;

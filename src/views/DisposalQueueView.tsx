import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { DisposalProposal } from '../types/inventory';
import { getDisposalQueue, batchApproveDisposals } from '../services/assetService';
import { printDisposalBAST } from '../utils/printDisposalBAST';
import { EmptyState, LoadingSpinner } from '../components/ui';

interface Props {
  currentUserId: number;
  currentUserName?: string;
  currentUserRole?: string;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
  onRefreshAssets?: () => void;
}

type FilterRegion = 'all' | string;
type SortKey = 'proposed_at' | 'region' | 'category';

const DisposalQueueView: React.FC<Props> = ({
  currentUserId,
  currentUserName = 'Super Admin',
  onShowToast,
  onRefreshAssets,
}) => {
  const [proposals, setProposals]     = useState<DisposalProposal[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<Set<number>>(new Set()); // asset_ids
  const [filterRegion, setFilterRegion] = useState<FilterRegion>('all');
  const [sortKey, setSortKey]         = useState<SortKey>('proposed_at');
  const [submitting, setSubmitting]   = useState(false);
  const [bastNo, setBastNo]           = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // Generate BAPA nomor default
  useEffect(() => {
    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    const seq = String(Math.floor(100 + Math.random() * 900));
    setBastNo(`BAPA/${ymd}/${seq}`);
  }, []);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDisposalQueue(filterRegion === 'all' ? undefined : filterRegion);
      setProposals(data);
      setSelected(new Set()); // Reset selection on reload
    } catch (err: any) {
      onShowToast?.(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [filterRegion, onShowToast]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  // Unique regions for filter dropdown
  const regions = useMemo(() => {
    const r = Array.from(new Set(proposals.map(p => p.region).filter(Boolean))) as string[];
    return r.sort();
  }, [proposals]);

  // Sorted & filtered list
  const sorted = useMemo(() => {
    return [...proposals].sort((a, b) => {
      if (sortKey === 'proposed_at') return new Date(a.proposed_at).getTime() - new Date(b.proposed_at).getTime();
      if (sortKey === 'region') return (a.region ?? '').localeCompare(b.region ?? '');
      if (sortKey === 'category') return (a.category_name ?? '').localeCompare(b.category_name ?? '');
      return 0;
    });
  }, [proposals, sortKey]);

  // Selection helpers
  const toggleSelect = (assetId: number) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(assetId) ? s.delete(assetId) : s.add(assetId);
      return s;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === sorted.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sorted.map(p => p.asset_id)));
    }
  };

  const handleBatchApprove = async () => {
    if (selected.size === 0) {
      onShowToast?.('Pilih setidaknya satu aset untuk disetujui.', 'error');
      return;
    }
    setShowConfirm(true);
  };

  const confirmApprove = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    try {
      const assetIds = Array.from(selected);
      const result = await batchApproveDisposals(
        assetIds,
        bastNo,
        currentUserId,
        `Batch disposal disetujui oleh ${currentUserName}`
      );

      onShowToast?.(
        `✅ ${result.processed} aset berhasil di-dispose${result.failed > 0 ? `, ${result.failed} gagal` : ''}. BAPA: ${bastNo}`,
        result.failed > 0 ? 'error' : 'success'
      );

      // Print BAPA
      const selectedProposals = proposals.filter(p => assetIds.includes(p.asset_id));
      printDisposalBAST({
        bastNo,
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        approvedBy: currentUserName,
        items: selectedProposals.map(p => ({
          serial_number: p.serial_number,
          brand: p.brand ?? '',
          model_type: p.model_type ?? '',
          category_name: p.category_name ?? '',
          site_name: p.site_name ?? p.site_alias ?? '',
          reason: p.reason_category,
        })),
      } as any);

      await loadQueue();
      onRefreshAssets?.();
    } catch (err: any) {
      onShowToast?.(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const allSelected = sorted.length > 0 && selected.size === sorted.length;
  const partialSelected = selected.size > 0 && selected.size < sorted.length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full pb-4 px-4">
      {/* Page Header */}
      <div className="flex items-center gap-3 py-4 mb-2">
        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
          <i className="fas fa-trash-alt text-orange-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-100">Antrean Afkir</h2>
          <p className="text-xs text-slate-500">
            {loading ? '...' : `${proposals.length} usulan menunggu persetujuan`}
          </p>
        </div>
        <button
          onClick={loadQueue}
          disabled={loading}
          className="ml-auto w-9 h-9 rounded-xl bg-slate-700/50 flex items-center justify-center hover:bg-slate-600/50 transition-colors"
        >
          <i className={`fas fa-sync-alt text-slate-400 text-sm ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {/* Region Filter */}
        <select
          value={filterRegion}
          onChange={e => setFilterRegion(e.target.value)}
          className="flex-1 text-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-blue-500"
        >
          <option value="all">Semua Region</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        {/* Sort */}
        <select
          value={sortKey}
          onChange={e => setSortKey(e.target.value as SortKey)}
          className="flex-1 text-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-blue-500"
        >
          <option value="proposed_at">Urut: Terlama</option>
          <option value="region">Urut: Region</option>
          <option value="category">Urut: Kategori</option>
        </select>
      </div>

      {/* Batch Action Bar */}
      {selected.size > 0 && (
        <div className="glass rounded-xl p-3 mb-3 flex items-center gap-3 border border-orange-500/30 bg-orange-500/5">
          <i className="fas fa-check-circle text-orange-400" />
          <span className="text-xs font-semibold text-orange-300 flex-1">
            {selected.size} aset dipilih
          </span>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={bastNo}
              onChange={e => setBastNo(e.target.value)}
              placeholder="No. BAPA"
              className="text-[10px] font-mono bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 w-36 focus:outline-none"
            />
            <button
              onClick={handleBatchApprove}
              disabled={submitting}
              className="px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-300 text-xs font-semibold border border-orange-500/40 hover:bg-orange-500/30 transition-all flex items-center gap-1.5"
            >
              <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-check'}`} />
              {submitting ? 'Memproses...' : 'Setujui & BAPA'}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner text="Memuat antrean afkir..." />
        </div>
      )}

      {/* Empty State */}
      {!loading && sorted.length === 0 && (
        <EmptyState
          icon="fa-check-double"
          title="Semua Selesai!"
          description="Tidak ada usulan afkir yang menunggu persetujuan saat ini."
          className="flex-1 py-10 border-none shadow-none bg-transparent"
        />
      )}

      {/* List */}
      {!loading && sorted.length > 0 && (
        <>
          {/* Select All Header */}
          <div className="flex items-center gap-3 px-1 mb-2">
            <button
              onClick={toggleSelectAll}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                allSelected ? 'bg-orange-500 border-orange-500' :
                partialSelected ? 'bg-orange-500/30 border-orange-500/50' :
                'border-slate-600 hover:border-slate-400'
              }`}
            >
              {(allSelected || partialSelected) && (
                <i className={`fas ${allSelected ? 'fa-check' : 'fa-minus'} text-white text-[9px]`} />
              )}
            </button>
            <span className="text-xs text-slate-500">
              Pilih semua ({sorted.length})
            </span>
          </div>

          {/* Proposal Cards */}
          <div className="space-y-2 flex-1 overflow-y-auto">
            {sorted.map((proposal) => {
              const isSelected = selected.has(proposal.asset_id);
              const daysSince = Math.floor(
                (Date.now() - new Date(proposal.proposed_at).getTime()) / 86400000
              );

              return (
                <div
                  key={proposal.id}
                  onClick={() => toggleSelect(proposal.asset_id)}
                  className={`glass rounded-xl p-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'border border-orange-500/50 bg-orange-500/8'
                      : 'border border-transparent hover:border-slate-600/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-600'
                    }`}>
                      {isSelected && <i className="fas fa-check text-white text-[9px]" />}
                    </div>

                    {/* Category Icon */}
                    <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${
                      proposal.category_color_bg ?? 'bg-slate-700'
                    } ${proposal.category_color_text ?? 'text-slate-400'}`}>
                      <i className={`fas ${proposal.category_icon ?? 'fa-box'} text-sm`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-100 truncate">
                            {proposal.brand} {proposal.model_type}
                          </p>
                          <p className="text-xs text-slate-400 font-mono">{proposal.serial_number}</p>
                        </div>
                        {/* Aging badge */}
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                          daysSince > 14 ? 'bg-red-500/20 text-red-300' :
                          daysSince > 7  ? 'bg-orange-500/20 text-orange-300' :
                                          'bg-slate-700/50 text-slate-500'
                        }`}>
                          {daysSince}h
                        </span>
                      </div>

                      {/* Reason */}
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <i className="fas fa-tag text-[9px] text-orange-400/70" />
                        <span className="text-[10px] text-orange-300/80">{proposal.reason_category}</span>
                      </div>

                      {/* Location & Proposer */}
                      <div className="mt-1 flex items-center gap-3 flex-wrap">
                        {proposal.site_name && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <i className="fas fa-map-marker-alt text-[9px]" />
                            {proposal.site_name}
                          </span>
                        )}
                        {proposal.region && (
                          <span className="text-[10px] text-slate-600">{proposal.region}</span>
                        )}
                        <span className="text-[10px] text-slate-600">
                          by {proposal.proposed_by_name ?? '—'}
                        </span>
                      </div>

                      {/* Photo indicator */}
                      {proposal.photo_url && (
                        <div className="mt-1.5">
                          <span className="text-[10px] text-blue-400/70 flex items-center gap-1">
                            <i className="fas fa-image text-[9px]" />
                            Ada foto
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-5 max-w-sm w-full border border-orange-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <i className="fas fa-exclamation-triangle text-red-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-100">Konfirmasi Pemusnahan Massal</p>
                <p className="text-xs text-slate-400">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mb-2">
              Anda akan menyetujui pemusnahan <strong className="text-orange-300">{selected.size} aset</strong> dengan nomor BAPA:
            </p>
            <p className="font-mono text-sm text-orange-300 bg-orange-500/10 rounded-lg px-3 py-2 mb-4">{bastNo}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-slate-700/50 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmApprove}
                className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 text-sm font-semibold hover:bg-red-500/30 transition-colors"
              >
                Ya, Musnahkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisposalQueueView;

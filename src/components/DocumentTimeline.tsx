import React, { useEffect, useState, useCallback } from 'react';
import type { AssetMovementLog } from '../types/inventory';
import { MOVEMENT_EVENT_TYPES } from '../types/inventory';
import { getAssetTimeline } from '../services/transactionService';

// ── Event type metadata ───────────────────────────────────────────────────────

interface EventMeta {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

const EVENT_META: Record<string, EventMeta> = {
  [MOVEMENT_EVENT_TYPES.MUTATION_COMPLETE]:      { label: 'Mutasi Selesai',      icon: 'fa-exchange-alt',    color: 'text-emerald-300', bgColor: 'bg-emerald-500/20' },
  [MOVEMENT_EVENT_TYPES.LOAN_DISPATCH]:          { label: 'Unit Dikirim',        icon: 'fa-truck',           color: 'text-blue-300',    bgColor: 'bg-blue-500/20'    },
  [MOVEMENT_EVENT_TYPES.LOAN_RETURN]:            { label: 'Unit Diretur',        icon: 'fa-reply',           color: 'text-purple-300',  bgColor: 'bg-purple-500/20'  },
  [MOVEMENT_EVENT_TYPES.LOAN_COMPLETE]:          { label: 'Pinjam Selesai',      icon: 'fa-check-double',    color: 'text-teal-300',    bgColor: 'bg-teal-500/20'    },
  [MOVEMENT_EVENT_TYPES.DISPOSAL_PROPOSED]:      { label: 'Diusulkan Afkir',     icon: 'fa-hourglass-half',  color: 'text-orange-300',  bgColor: 'bg-orange-500/20'  },
  [MOVEMENT_EVENT_TYPES.DISPOSAL_APPROVED]:      { label: 'Afkir Disetujui',     icon: 'fa-trash-alt',       color: 'text-red-300',     bgColor: 'bg-red-500/20'     },
  [MOVEMENT_EVENT_TYPES.OPNAME_SCAN]:            { label: 'Discan Opname',       icon: 'fa-qrcode',          color: 'text-slate-300',   bgColor: 'bg-slate-500/20'   },
  [MOVEMENT_EVENT_TYPES.RECONCILIATION_APPLIED]: { label: 'Rekonsiliasi',        icon: 'fa-clipboard-check', color: 'text-cyan-300',    bgColor: 'bg-cyan-500/20'    },
  [MOVEMENT_EVENT_TYPES.LOCATION_CORRECTION]:    { label: 'Koreksi Lokasi',      icon: 'fa-map-marker-alt',  color: 'text-yellow-300',  bgColor: 'bg-yellow-500/20'  },
  [MOVEMENT_EVENT_TYPES.STATUS_CHANGE]:          { label: 'Perubahan Status',    icon: 'fa-sync-alt',        color: 'text-indigo-300',  bgColor: 'bg-indigo-500/20'  },
  [MOVEMENT_EVENT_TYPES.TRANSACTION_COMPLETE]:   { label: 'Transaksi Selesai',   icon: 'fa-check-circle',    color: 'text-green-300',   bgColor: 'bg-green-500/20'   },
};

function getEventMeta(eventType: string): EventMeta {
  return EVENT_META[eventType] ?? {
    label: eventType.replace(/_/g, ' '),
    icon: 'fa-circle-dot',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
  };
}

function formatDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  assetId: number;
  serialNumber?: string;
}

const DocumentTimeline: React.FC<Props> = ({ assetId, serialNumber }) => {
  const [logs, setLogs] = useState<AssetMovementLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAssetTimeline(assetId);
      setLogs(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    if (assetId) load();
  }, [assetId, load]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
        <p className="text-xs text-slate-500">Memuat riwayat pergerakan...</p>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/30 text-center">
        <i className="fas fa-exclamation-triangle text-red-400 text-lg mb-2 block" />
        <p className="text-xs text-red-300">{error}</p>
        <button onClick={load} className="mt-3 text-xs text-blue-400 hover:text-blue-300 underline">
          Coba lagi
        </button>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-700/50 flex items-center justify-center mb-1">
          <i className="fas fa-history text-2xl text-slate-600" />
        </div>
        <p className="text-sm font-medium text-slate-400">Belum ada riwayat pergerakan</p>
        <p className="text-xs text-slate-600 max-w-48">
          Riwayat akan muncul setiap kali aset berpindah lokasi atau mengalami perubahan status krusial.
        </p>
      </div>
    );
  }

  // ── Timeline ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <i className="fas fa-stream text-blue-400 text-sm" />
          <span className="text-sm font-semibold text-slate-200">Riwayat Pergerakan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">{logs.length} event</span>
          <button
            onClick={load}
            title="Refresh"
            className="w-6 h-6 rounded-lg bg-slate-700/50 flex items-center justify-center hover:bg-slate-600/50 transition-colors"
          >
            <i className="fas fa-sync-alt text-slate-400 text-xs" />
          </button>
        </div>
      </div>

      {/* Immutable Ledger badge */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <i className="fas fa-lock text-emerald-500/60 text-xs" />
        <span className="text-[10px] text-slate-600 font-mono">
          IMMUTABLE LEDGER — catatan tidak dapat diubah atau dihapus
        </span>
      </div>

      {/* Timeline items */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-slate-600/80 via-slate-700/50 to-transparent" />

        <div className="space-y-0">
          {logs.map((log, index) => {
            const meta = getEventMeta(log.event_type);
            const { date, time } = formatDate(log.logged_at);
            const isFirst = index === 0;

            return (
              <div key={log.id} className="relative flex gap-3 pb-5">
                {/* Icon node */}
                <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-xl ${meta.bgColor} flex items-center justify-center border border-white/10 ${
                  isFirst ? 'ring-2 ring-blue-500/30 ring-offset-1 ring-offset-slate-900' : ''
                }`}>
                  <i className={`fas ${meta.icon} text-sm ${meta.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  {/* Event label + timestamp */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] text-slate-400 font-mono">{time}</p>
                      <p className="text-[10px] text-slate-600">{date}</p>
                    </div>
                  </div>

                  {/* Location arrow */}
                  {(log.from_site_code || log.to_site_code) && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {log.from_site_name ?? log.from_site_code ?? '—'}
                      </span>
                      <i className="fas fa-arrow-right text-slate-600 text-[9px]" />
                      <span className="text-[10px] text-slate-400 font-mono font-medium">
                        {log.to_site_name ?? log.to_site_code ?? '—'}
                      </span>
                    </div>
                  )}

                  {/* Document code */}
                  {log.document_code && (
                    <div className="mb-1">
                      <span className="text-[10px] font-mono text-blue-400/70 bg-blue-500/10 px-1.5 py-0.5 rounded">
                        {log.document_code}
                      </span>
                    </div>
                  )}

                  {/* Executor */}
                  {(log.executor_full_name ?? log.executor_name) && (
                    <div className="flex items-center gap-1 mb-1">
                      <i className="fas fa-user text-[9px] text-slate-600" />
                      <span className="text-[10px] text-slate-500">
                        {log.executor_full_name ?? log.executor_name}
                      </span>
                    </div>
                  )}

                  {/* Notes */}
                  {log.notes && (
                    <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5 pl-1 border-l border-slate-700">
                      {log.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer — immutable guarantee */}
      <div className="pt-2 border-t border-slate-800 text-center">
        <p className="text-[10px] text-slate-700 font-mono">
          SN: {serialNumber ?? '—'} · {logs.length} entri · tidak dapat dihapus
        </p>
      </div>
    </div>
  );
};

export default DocumentTimeline;

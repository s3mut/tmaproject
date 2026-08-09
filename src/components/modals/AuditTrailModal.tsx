import { useState, useEffect } from 'react';
import type { AuditTrailRow } from '../../services/reportService';
import { getAuditTrail, exportToCSV, fmtDate } from '../../services/reportService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
  /** Pre-fill asset serial number dari luar (opsional) */
  initialSerial?: string;
  /** Tipe event awal untuk filter lokal (opsional) */
  initialFilterType?: string;
}

const EVENT_ICONS: Record<string, { icon: string; color: string }> = {
  'MUTASI Completed': { icon: 'fa-check-circle',  color: 'text-emerald-400' },
  'MUTASI Pending':   { icon: 'fa-clock',          color: 'text-amber-400'   },
  'MUTASI Rejected':  { icon: 'fa-times-circle',   color: 'text-red-400'     },
  'PINJAM Borrowed':  { icon: 'fa-hand-holding-box', color: 'text-purple-400' },
  'PINJAM Closed':    { icon: 'fa-check-double',   color: 'text-teal-400'    },
  'PINJAM Cancelled': { icon: 'fa-ban',             color: 'text-slate-400'   },
  'PINJAM Rejected':  { icon: 'fa-times-circle',   color: 'text-red-400'     },
};

function getEventMeta(type: string) {
  return EVENT_ICONS[type] ?? { icon: 'fa-circle-dot', color: 'text-blue-400' };
}

const AuditTrailModal = ({ isOpen, onClose, onShowToast, initialSerial = '', initialFilterType = '' }: Props) => {
  const [serialNum,  setSerialNum]  = useState(initialSerial);
  const [fromDate,   setFromDate]   = useState('');
  const [toDate,     setToDate]     = useState('');
  const [filterType, setFilterType] = useState(initialFilterType);
  const [trail,      setTrail]      = useState<AuditTrailRow[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [searched,   setSearched]   = useState(false);

  useEffect(() => {
    if (initialSerial) setSerialNum(initialSerial);
  }, [initialSerial]);

  useEffect(() => {
    if (initialFilterType) setFilterType(initialFilterType);
  }, [initialFilterType]);

  // Optionally auto-search if initialFilterType is provided
  useEffect(() => {
    if (isOpen && initialFilterType && !searched) {
      handleSearch();
    }
  }, [isOpen, initialFilterType]);

  if (!isOpen) return null;

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const data = await getAuditTrail({
        serialNum: serialNum.trim() || null,
        fromDate:  fromDate || null,
        toDate:    toDate   || null,
        limit: 100,
      });
      setTrail(data);
    } catch (e: any) {
      onShowToast?.(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredTrail = trail.filter(t => filterType ? t.event_type.startsWith(filterType) : true);

  const handleExport = () => {
    exportToCSV(
      filteredTrail.map((t, i) => ({
        No: i + 1,
        Waktu: fmtDate(t.event_time),
        'Jenis Event': t.event_type,
        Deskripsi: t.description,
        'Dilakukan Oleh': t.actor_name,
        'Dari Lokasi': t.from_loc,
        'Ke Lokasi': t.to_loc,
        Catatan: t.notes ?? '-',
      })),
      `Audit_Trail_${serialNum || 'All'}`
    );
    onShowToast?.('📥 Audit trail berhasil diekspor!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl bg-slate-900 border border-slate-700/60 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-700/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
              <i className="fas fa-history text-indigo-400 text-lg" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-50">Audit Trail</h2>
              <p className="text-xs text-slate-400">Riwayat lengkap pergerakan aset</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-50 transition-colors">
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Filter Panel */}
        <div className="p-4 border-b border-slate-700/30 space-y-3 shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Serial Number aset (kosongkan = semua)"
              value={serialNum}
              onChange={(e) => setSerialNum(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-50 text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
            >
              <i className="fas fa-search" />
            </button>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider ml-1">Dari Tanggal</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-50 text-xs focus:outline-none focus:border-indigo-500 mt-1" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider ml-1">Sampai Tanggal</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-50 text-xs focus:outline-none focus:border-indigo-500 mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-50 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="">Semua Tipe Event</option>
              <option value="MUTASI">Mutasi (Perpindahan)</option>
              <option value="PINJAM">Peminjaman</option>
            </select>
          </div>
          {filteredTrail.length > 0 && (
            <button onClick={handleExport}
              className="w-full py-2 rounded-xl bg-emerald-600/70 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all">
              <i className="fas fa-file-csv" /> Export CSV ({filteredTrail.length} entri)
            </button>
          )}
        </div>

        {/* Timeline */}
        <div className="overflow-y-auto flex-1 p-5">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <i className="fas fa-spinner fa-spin mr-2" /> Memuat audit trail...
            </div>
          ) : !searched ? (
            <div className="py-16 text-center">
              <i className="fas fa-search text-3xl text-slate-600 mb-3 block" />
              <p className="text-slate-500 text-sm">Masukkan serial number atau pilih rentang tanggal,<br />lalu tekan tombol cari.</p>
            </div>
          ) : filteredTrail.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <i className="fas fa-inbox text-2xl opacity-40 mb-2 block" />
              Tidak ada riwayat ditemukan.
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-5 top-2 bottom-2 w-px bg-slate-700/60" />
              <div className="space-y-4">
                {filteredTrail.map((item, i) => {
                  const meta = getEventMeta(item.event_type);
                  return (
                    <div key={i} className="flex gap-4 relative">
                      {/* Dot */}
                      <div className={`w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center shrink-0 z-10 ${meta.color}`}>
                        <i className={`fas ${meta.icon} text-sm`} />
                      </div>
                      {/* Content */}
                      <div className="flex-1 bg-slate-800/60 border border-slate-700/40 rounded-2xl p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-50">{item.description}</p>
                          <span className="text-[10px] text-slate-500 shrink-0 whitespace-nowrap">{fmtDate(item.event_time)}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                          <span><i className="fas fa-user mr-1 opacity-60" />{item.actor_name}</span>
                          {item.from_loc !== '-' && (
                            <span><i className="fas fa-arrow-right mx-1 opacity-40" />{item.from_loc} → {item.to_loc}</span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${meta.color} bg-slate-700/50`}>
                            {item.event_type}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-[11px] text-slate-500 italic">"{item.notes}"</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditTrailModal;

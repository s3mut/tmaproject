import { useState, useEffect } from 'react';
import type { OverdueLoan } from '../../services/reportService';
import { exportToCSV, sendOverdueNotificationToBot, fmtDate } from '../../services/reportService';

interface Props {
  isOpen: boolean;
  overdueLoans: OverdueLoan[];
  onClose: () => void;
  onRefresh: () => Promise<OverdueLoan[]>;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

const BOT_TOKEN_KEY = 'tma_bot_token';
const CHAT_ID_KEY   = 'tma_alert_chat_id';

const OverdueAlertModal = ({ isOpen, overdueLoans, onClose, onRefresh, onShowToast }: Props) => {
  const [sending, setSending]     = useState(false);
  const [botToken, setBotToken]   = useState(() => localStorage.getItem(BOT_TOKEN_KEY) ?? '');
  const [chatId, setChatId]       = useState(() => localStorage.getItem(CHAT_ID_KEY) ?? '');
  const [showConfig, setShowConfig] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRefreshing(true);
      onRefresh().finally(() => setRefreshing(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendBot = async () => {
    if (!botToken || !chatId) {
      setShowConfig(true);
      return;
    }
    setSending(true);
    const ok = await sendOverdueNotificationToBot({ botToken, chatId, overdueLoans });
    setSending(false);
    if (ok) {
      localStorage.setItem(BOT_TOKEN_KEY, botToken);
      localStorage.setItem(CHAT_ID_KEY, chatId);
      onShowToast?.('✅ Notifikasi overdue berhasil dikirim ke Telegram!', 'success');
    } else {
      onShowToast?.('❌ Gagal mengirim notifikasi. Periksa Bot Token & Chat ID.', 'error');
    }
  };

  const handleExportCSV = () => {
    exportToCSV(
      overdueLoans.map((l) => ({
        'Loan Code': l.loan_code,
        'Toko (Site)': l.site_alias,
        'Nama Toko': l.site_name ?? '-',
        Region: l.region ?? '-',
        Kategori: l.category_name,
        Tujuan: l.purpose,
        Status: l.status,
        'Jatuh Tempo': fmtDate(l.due_date),
        'Terlambat (Hari)': l.overdue_days,
        'Diminta Oleh': l.requested_by_name,
        'S/N Unit': l.asset_serial_number ?? '-',
      })),
      'Laporan_Overdue'
    );
    onShowToast?.('📥 Laporan overdue berhasil diekspor!', 'success');
  };

  const urgencyColor = (days: number) => {
    if (days >= 14) return 'border-red-500/60 bg-red-500/10';
    if (days >= 7)  return 'border-orange-500/60 bg-orange-500/10';
    return 'border-amber-500/60 bg-amber-500/10';
  };

  const urgencyBadge = (days: number) => {
    if (days >= 14) return { cls: 'bg-red-500 text-white animate-pulse', label: `🔴 ${days} HARI` };
    if (days >= 7)  return { cls: 'bg-orange-500 text-white',              label: `🟠 ${days} HARI` };
    return                 { cls: 'bg-amber-500 text-slate-900',            label: `🟡 ${days} HARI` };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl bg-slate-900 border border-slate-700/60 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-700/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center">
              <i className="fas fa-bell text-red-400 text-lg animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Alert Overdue</h2>
              <p className="text-xs text-slate-400">
                {refreshing ? (
                  <><i className="fas fa-spinner fa-spin mr-1" />Memuat...</>
                ) : (
                  <><span className="text-red-400 font-semibold">{overdueLoans.length} unit</span> melewati jatuh tempo</>
                )}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:text-white transition-colors">
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="px-5 py-3 border-b border-slate-700/30 flex gap-2 shrink-0 flex-wrap">
          <button
            onClick={handleSendBot}
            disabled={sending || overdueLoans.length === 0}
            className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <i className={`fab fa-telegram ${sending ? 'fa-spin' : ''}`} />
            {sending ? 'Mengirim...' : 'Kirim ke Telegram Bot'}
          </button>
          <button
            onClick={handleExportCSV}
            disabled={overdueLoans.length === 0}
            className="flex-1 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <i className="fas fa-file-csv" /> Export CSV
          </button>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="w-9 h-9 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center transition-colors"
            title="Konfigurasi Bot Token"
          >
            <i className="fas fa-cog text-xs" />
          </button>
        </div>

        {/* Bot Config */}
        {showConfig && (
          <div className="px-5 py-3 border-b border-slate-700/30 bg-slate-800/50 space-y-2 shrink-0">
            <p className="text-[11px] text-slate-400 font-medium">Konfigurasi Telegram Bot (tersimpan di browser)</p>
            <input
              type="text"
              placeholder="Bot Token (dari @BotFather)"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-700 border border-slate-600 text-slate-900 dark:text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Chat ID Grup Admin (misal: -1001234567890)"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-700 border border-slate-600 text-slate-900 dark:text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => { localStorage.setItem(BOT_TOKEN_KEY, botToken); localStorage.setItem(CHAT_ID_KEY, chatId); setShowConfig(false); onShowToast?.('Konfigurasi bot tersimpan!', 'success'); }}
              className="w-full py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold"
            >Simpan Konfigurasi</button>
          </div>
        )}

        {/* Overdue List */}
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {overdueLoans.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-check-circle text-emerald-400 text-3xl" />
              </div>
              <p className="text-slate-900 dark:text-white font-semibold">Tidak ada pinjaman overdue</p>
              <p className="text-sm text-slate-500 mt-1">Semua unit sudah dikembalikan tepat waktu 🎉</p>
            </div>
          ) : (
            overdueLoans.map((loan) => {
              const badge = urgencyBadge(loan.overdue_days);
              return (
                <div key={loan.id} className={`rounded-2xl border p-4 space-y-2 ${urgencyColor(loan.overdue_days)}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">{loan.loan_code}</p>
                      <p className="text-xs text-slate-300 mt-0.5">
                        <i className="fas fa-store mr-1 opacity-60" />{loan.site_alias}
                        {loan.site_name && loan.site_name !== loan.site_alias && ` — ${loan.site_name}`}
                        {loan.region && <span className="ml-2 text-slate-400">({loan.region})</span>}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span><i className="fas fa-boxes mr-1 opacity-60" />{loan.category_name}</span>
                    <span><i className="fas fa-calendar mr-1 opacity-60" />Jatuh tempo: {fmtDate(loan.due_date)}</span>
                    {loan.asset_serial_number && (
                      <span className="font-mono text-blue-400"><i className="fas fa-barcode mr-1" />{loan.asset_serial_number}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      <i className="fas fa-user mr-1 opacity-50" />{loan.requested_by_name}
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                      loan.status === 'Borrowed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>{loan.status}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default OverdueAlertModal;

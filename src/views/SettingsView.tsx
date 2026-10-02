import React, { useState, useEffect, lazy, Suspense } from 'react';
import type { Site, Category, TelegramUser, TelegramGroupRoute } from '../types/inventory';
import { Button, ModalShell, Input, LoadingSpinner, EmptyState } from '../components/ui';

import {
  getSystemSetting,
  updateSystemSetting,
  getTelegramGroupRoutes,
  upsertTelegramGroupRoute,
  deleteTelegramGroupRoute,
} from '../services/settingsService';

const UserManagementModal = lazy(() => import('../components/modals/UserManagementModal'));

export interface SettingMenuItemProps {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  isDanger?: boolean;
  isToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (val: boolean) => void;
  onClick?: () => void;
}

interface SlaConfig {
  max_loan_days: number;
  reminder_days_before: number;
  overdue_escalation: boolean;
  max_transfer_days: number;
}

interface OperationalControls {
  freeze_transactions: boolean;
  freeze_reason: string;
  active_opname_session: boolean;
  opname_session_name: string;
}

interface WebhookGsheetConfig {
  enabled: boolean;
  sheet_url: string;
  auto_sync_mutations: boolean;
}

interface NotificationTemplates {
  bot_header: string;
  bast_footer_note: string;
}

interface Props {
  onBack: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
  sites?: Site[];
  categories?: Category[];
  currentUser?: TelegramUser | null;
  onRefresh?: () => void;
}

export const SettingMenuItem: React.FC<SettingMenuItemProps> = ({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  badge,
  badgeColor = 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  isDanger = false,
  isToggle = false,
  toggleValue = false,
  onToggle,
  onClick,
}) => {
  return (
    <div
      onClick={isToggle ? undefined : onClick}
      className={`group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl transition-all duration-200 select-none ${
        isDanger
          ? 'bg-red-500/5 dark:bg-red-950/20 hover:bg-red-500/10 border border-red-500/20 dark:border-red-900/40'
          : 'bg-white/80 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800/80'
      } ${!isToggle && onClick ? 'cursor-pointer active:scale-[0.99]' : ''}`}
    >
      <div className="flex items-center gap-3.5 min-w-0 pr-2">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${iconBg} ${iconColor}`}
        >
          <i className={`fas ${icon} text-base`} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className={`text-xs sm:text-sm font-semibold truncate ${
                isDanger
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {title}
            </h4>
            {badge && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}
              >
                {badge}
              </span>
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="shrink-0 flex items-center">
        {isToggle ? (
          <button
            type="button"
            role="switch"
            aria-checked={toggleValue}
            onClick={() => onToggle?.(!toggleValue)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              toggleValue
                ? isDanger
                  ? 'bg-red-600'
                  : 'bg-blue-600'
                : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                toggleValue ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        ) : (
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all">
            <i className="fas fa-chevron-right text-xs" />
          </div>
        )}
      </div>
    </div>
  );
};

const SettingsView: React.FC<Props> = ({
  onBack,
  onShowToast,
  sites = [],
  categories = [],
  currentUser,
  onRefresh,
}) => {
  const [userMgmtOpen, setUserMgmtOpen] = useState(false);
  const [slaModalOpen, setSlaModalOpen] = useState(false);
  const [tgRoutingModalOpen, setTgRoutingModalOpen] = useState(false);
  const [gsheetModalOpen, setGsheetModalOpen] = useState(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [masterDataModalOpen, setMasterDataModalOpen] = useState(false);

  const [slaConfig, setSlaConfig] = useState<SlaConfig>({
    max_loan_days: 14,
    reminder_days_before: 2,
    overdue_escalation: true,
    max_transfer_days: 7,
  });

  const [opsControls, setOpsControls] = useState<OperationalControls>({
    freeze_transactions: false,
    freeze_reason: '',
    active_opname_session: false,
    opname_session_name: '',
  });

  const [gsheetConfig, setGsheetConfig] = useState<WebhookGsheetConfig>({
    enabled: false,
    sheet_url: '',
    auto_sync_mutations: true,
  });

  const [templates, setTemplates] = useState<NotificationTemplates>({
    bot_header: '🔔 <b>E1-TMA SYSTEM NOTIFICATION</b>',
    bast_footer_note:
      'Dokumen ini sah dan diterbitkan secara digital oleh Sistem Manajemen Aset E1-TMA.',
  });

  const [tgRoutes, setTgRoutes] = useState<TelegramGroupRoute[]>([]);
  const [newRoute, setNewRoute] = useState({
    group_name: '',
    chat_id: '',
    region: 'ALL',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [sla, ops, gsheet, tmpl, routes] = await Promise.all([
        getSystemSetting<SlaConfig>('sla_limits', slaConfig),
        getSystemSetting<OperationalControls>('operational_controls', opsControls),
        getSystemSetting<WebhookGsheetConfig>('webhook_gsheet', gsheetConfig),
        getSystemSetting<NotificationTemplates>('notification_templates', templates),
        getTelegramGroupRoutes(),
      ]);

      setSlaConfig(sla);
      setOpsControls(ops);
      setGsheetConfig(gsheet);
      setTemplates(tmpl);
      setTgRoutes(routes);
    } catch (err) {
      console.error('[SettingsView] Gagal load settings:', err);
      onShowToast?.('Gagal memuat sebagian konfigurasi.', 'error');
    }
  };

  const handleToggleFreeze = async (freeze: boolean) => {
    const updated: OperationalControls = {
      ...opsControls,
      freeze_transactions: freeze,
      freeze_reason: freeze ? 'Dibekukan sementara oleh Super Admin untuk audit' : '',
    };
    setOpsControls(updated);
    const success = await updateSystemSetting(
      'operational_controls',
      updated,
      currentUser?.telegram_id,
      'Kontrol pembekuan mutasi dan sesi opname'
    );
    if (success) {
      onShowToast?.(
        freeze
          ? '⚠️ Transaksi dibekukan! Pengguna tidak dapat membuat mutasi baru.'
          : '✅ Pembekuan transaksi dibuka kembali.',
        freeze ? 'error' : 'success'
      );
    } else {
      onShowToast?.('Gagal menyimpan status pembekuan.', 'error');
    }
  };

  const handleToggleOpname = async (active: boolean) => {
    const updated: OperationalControls = {
      ...opsControls,
      active_opname_session: active,
      opname_session_name: active ? `Sesi Audit Fisik Nasional ${new Date().getFullYear()}` : '',
    };
    setOpsControls(updated);
    const success = await updateSystemSetting(
      'operational_controls',
      updated,
      currentUser?.telegram_id,
      'Kontrol pembekuan mutasi dan sesi opname'
    );
    if (success) {
      onShowToast?.(
        active
          ? '📋 Sesi Stock Opname resmi dibuka secara nasional!'
          : 'Sesi Stock Opname telah ditutup.',
        'success'
      );
    } else {
      onShowToast?.('Gagal memperbarui status sesi opname.', 'error');
    }
  };

  const handleSaveSla = async () => {
    const ok = await updateSystemSetting(
      'sla_limits',
      slaConfig,
      currentUser?.telegram_id,
      'Konfigurasi batas waktu SLA peminjaman & mutasi perangkat'
    );
    if (ok) {
      onShowToast?.('Konfigurasi SLA berhasil disimpan!', 'success');
      setSlaModalOpen(false);
    } else {
      onShowToast?.('Gagal menyimpan SLA limits.', 'error');
    }
  };

  const handleSaveGsheet = async () => {
    const ok = await updateSystemSetting(
      'webhook_gsheet',
      gsheetConfig,
      currentUser?.telegram_id,
      'Integrasi webhook Google Sheets'
    );
    if (ok) {
      onShowToast?.('Pengaturan Google Sheets tersimpan!', 'success');
      setGsheetModalOpen(false);
    } else {
      onShowToast?.('Gagal menyimpan Google Sheets config.', 'error');
    }
  };

  const handleSaveTemplates = async () => {
    const ok = await updateSystemSetting(
      'notification_templates',
      templates,
      currentUser?.telegram_id,
      'Template teks kustom untuk bot telegram dan BAST'
    );
    if (ok) {
      onShowToast?.('Template dokumen & pesan berhasil diperbarui!', 'success');
      setTemplatesModalOpen(false);
    } else {
      onShowToast?.('Gagal menyimpan template.', 'error');
    }
  };

  const handleAddTgRoute = async () => {
    if (!newRoute.group_name || !newRoute.chat_id) {
      onShowToast?.('Nama grup dan Chat ID wajib diisi!', 'error');
      return;
    }
    const ok = await upsertTelegramGroupRoute({
      group_name: newRoute.group_name,
      chat_id: newRoute.chat_id,
      region: newRoute.region === 'ALL' ? null : newRoute.region,
      events: ['ALL'],
      is_active: true,
    });
    if (ok) {
      onShowToast?.('Rute grup Telegram berhasil ditambahkan!', 'success');
      setNewRoute({ group_name: '', chat_id: '', region: 'ALL' });
      const routes = await getTelegramGroupRoutes();
      setTgRoutes(routes);
    } else {
      onShowToast?.('Gagal menambahkan rute grup.', 'error');
    }
  };

  const handleDeleteTgRoute = async (id: number) => {
    const ok = await deleteTelegramGroupRoute(id);
    if (ok) {
      onShowToast?.('Rute grup dihapus.', 'success');
      setTgRoutes((prev) => prev.filter((r) => r.id !== id));
    }
  };

  return (
    <div className="pb-24 max-w-2xl mx-auto space-y-6">
      {/* ── Top Bar with Back Button ── */}
      <div className="flex items-center justify-between pt-1">
        <Button
          variant="secondary"
          size="sm"
          icon="fa-arrow-left"
          onClick={onBack}
          className="rounded-xl"
        >
          Kembali ke Profil
        </Button>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
          <i className="fas fa-shield-alt mr-1" /> SUPER ADMIN
        </span>
      </div>

      {/* ── Banner Header ── */}
      <div className="glass p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-br from-white/90 via-slate-50/70 to-purple-50/30 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-purple-950/30 shadow-lg">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white text-xl shadow-md shadow-purple-500/30 shrink-0">
            <i className="fas fa-sliders-h" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50">
              Super Admin Settings Hub
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Pusat konfigurasi dinamis aplikasi E1-TMA. Seluruh pengaturan tersimpan di database
              dan berlaku secara instan tanpa perlu rebuild / deploy ulang.
            </p>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: Akun & Wewenang ── */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <i className="fas fa-user-shield text-xs text-indigo-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            1. Akun & Wewenang
          </h3>
        </div>
        <div className="space-y-2">
          <SettingMenuItem
            icon="fa-users-cog"
            iconColor="text-indigo-400"
            iconBg="bg-indigo-500/20"
            title="User Management & Role IT"
            subtitle="Kelola role user, super admin, reset password web, dan approval"
            badge="MASTER"
            badgeColor="bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
            onClick={() => setUserMgmtOpen(true)}
          />
          <SettingMenuItem
            icon="fa-map-marked-alt"
            iconColor="text-blue-400"
            iconBg="bg-blue-500/20"
            title="Region & Wilayah Wewenang"
            subtitle="Atur wilayah wewenang IT (JKT, JATIM, WEST, ALL) per user"
            onClick={() => setUserMgmtOpen(true)}
          />
        </div>
      </div>

      {/* ── SECTION 2: Master Data ── */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <i className="fas fa-database text-xs text-emerald-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            2. Master Data Referensi
          </h3>
        </div>
        <div className="space-y-2">
          <SettingMenuItem
            icon="fa-store-alt"
            iconColor="text-emerald-400"
            iconBg="bg-emerald-500/20"
            title="Sites & Cabang Operasional"
            subtitle={`${sites.length} site terdaftar — pantau alias toko, region, & alamat cabang`}
            badge={`${sites.length} SITE`}
            badgeColor="bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
            onClick={() => setMasterDataModalOpen(true)}
          />
          <SettingMenuItem
            icon="fa-boxes"
            iconColor="text-teal-400"
            iconBg="bg-teal-500/20"
            title="Kategori & Klasifikasi Aset"
            subtitle={`${categories.length} kategori — master barcode, icon, & skema penamaan`}
            badge={`${categories.length} KATEGORI`}
            badgeColor="bg-teal-500/15 text-teal-400 border-teal-500/30"
            onClick={() => setMasterDataModalOpen(true)}
          />
          <SettingMenuItem
            icon="fa-clipboard-list"
            iconColor="text-cyan-400"
            iconBg="bg-cyan-500/20"
            title="Alasan Mutasi & Peminjaman"
            subtitle="Daftar alasan standar: Backup Toko, Event Promo, Rusak Fisik, dsb."
            onClick={() => setMasterDataModalOpen(true)}
          />
        </div>
      </div>

      {/* ── SECTION 3: SLA & Otomasi ── */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <i className="fas fa-clock text-xs text-amber-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            3. SLA & Otomasi Sistem
          </h3>
        </div>
        <div className="space-y-2">
          <SettingMenuItem
            icon="fa-stopwatch"
            iconColor="text-amber-400"
            iconBg="bg-amber-500/20"
            title="Batas Waktu & SLA Pinjam Unit"
            subtitle={`Maksimal ${slaConfig.max_loan_days} hari pinjam standar — pengingat H-${slaConfig.reminder_days_before}`}
            badge={`${slaConfig.max_loan_days} HARI`}
            badgeColor="bg-amber-500/15 text-amber-400 border-amber-500/30"
            onClick={() => setSlaModalOpen(true)}
          />
          <SettingMenuItem
            icon="fa-file-excel"
            iconColor="text-emerald-400"
            iconBg="bg-emerald-500/20"
            title="Webhook & Sinkronisasi GSheets"
            subtitle={
              gsheetConfig.enabled
                ? 'Aktif — log transaksi otomatis dicadangkan ke Spreadsheet'
                : 'Nonaktif — klik untuk mengonfigurasi tautan spreadsheet'
            }
            badge={gsheetConfig.enabled ? 'AKTIF' : 'OFF'}
            badgeColor={
              gsheetConfig.enabled
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
            }
            onClick={() => setGsheetModalOpen(true)}
          />
        </div>
      </div>

      {/* ── SECTION 4: Komunikasi & Dokumen ── */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <i className="fab fa-telegram-plane text-xs text-sky-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            4. Komunikasi & Format Dokumen
          </h3>
        </div>
        <div className="space-y-2">
          <SettingMenuItem
            icon="fa-comments"
            iconColor="text-sky-400"
            iconBg="bg-sky-500/20"
            title="Telegram Multi-Group Routing"
            subtitle={`${tgRoutes.length} grup/channel terhubung — routing notif per region wilayah`}
            badge={`${tgRoutes.length} RUTE`}
            badgeColor="bg-sky-500/15 text-sky-400 border-sky-500/30"
            onClick={() => setTgRoutingModalOpen(true)}
          />
          <SettingMenuItem
            icon="fa-envelope-open-text"
            iconColor="text-blue-400"
            iconBg="bg-blue-500/20"
            title="Template Pesan Bot Telegram"
            subtitle="Kustomisasi header pesan notifikasi HTML pada bot E1-TMA"
            onClick={() => setTemplatesModalOpen(true)}
          />
          <SettingMenuItem
            icon="fa-file-signature"
            iconColor="text-violet-400"
            iconBg="bg-violet-500/20"
            title="Template Dokumen BAST & Legalitas"
            subtitle="Atur catatan kaki, nomor format, dan kalimat disclaimer cetak BAST"
            onClick={() => setTemplatesModalOpen(true)}
          />
        </div>
      </div>

      {/* ── SECTION 5: Kontrol Operasional (ZONA BAHAYA) ── */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <i className="fas fa-exclamation-triangle text-xs text-red-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-red-500 dark:text-red-400">
            5. Kontrol Operasional & Zona Kritis
          </h3>
        </div>
        <div className="space-y-2">
          <SettingMenuItem
            icon="fa-lock"
            iconColor="text-red-500"
            iconBg="bg-red-500/20"
            title="Freeze Transaksi Nasional"
            subtitle={
              opsControls.freeze_transactions
                ? '⚠️ TRANSAKSI SEDANG DIBEKUKAN! Seluruh pembuatan mutasi dikunci'
                : 'Status Normal — pengguna diizinkan mengajukan mutasi & pinjam'
            }
            badge={opsControls.freeze_transactions ? 'FROZEN' : 'NORMAL'}
            badgeColor={
              opsControls.freeze_transactions
                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            }
            isDanger={opsControls.freeze_transactions}
            isToggle
            toggleValue={opsControls.freeze_transactions}
            onToggle={handleToggleFreeze}
          />
          <SettingMenuItem
            icon="fa-clipboard-check"
            iconColor={opsControls.active_opname_session ? 'text-amber-500' : 'text-slate-400'}
            iconBg={opsControls.active_opname_session ? 'bg-amber-500/20' : 'bg-slate-800'}
            title="Sesi Stock Opname Aktif"
            subtitle={
              opsControls.active_opname_session
                ? 'Audit fisik terbuka — teknisi cabang dapat melakukan opname'
                : 'Sesi audit opname ditutup'
            }
            badge={opsControls.active_opname_session ? 'SESI TERBUKA' : 'DITUTUP'}
            badgeColor={
              opsControls.active_opname_session
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
            }
            isToggle
            toggleValue={opsControls.active_opname_session}
            onToggle={handleToggleOpname}
          />
        </div>
      </div>

      {/* Sub-modals */}
      <ModalShell
        isOpen={slaModalOpen}
        onClose={() => setSlaModalOpen(false)}
        title="Pengaturan Batas Waktu & SLA"
        titleIcon="fa-stopwatch"
        titleIconBg="bg-amber-500/20 text-amber-400"
      >
        <div className="space-y-4 text-xs">
          <Input
            label="Maksimal Durasi Pinjam Standar (Hari)"
            type="number"
            value={String(slaConfig.max_loan_days)}
            onChange={(e) =>
              setSlaConfig((p) => ({ ...p, max_loan_days: parseInt(e.target.value, 10) || 14 }))
            }
          />
          <Input
            label="Pengingat Sebelum Jatuh Tempo (H- Hari)"
            type="number"
            value={String(slaConfig.reminder_days_before)}
            onChange={(e) =>
              setSlaConfig((p) => ({ ...p, reminder_days_before: parseInt(e.target.value, 10) || 2 }))
            }
          />
          <Input
            label="Toleransi Waktu Pengiriman Mutasi (Hari)"
            type="number"
            value={String(slaConfig.max_transfer_days)}
            onChange={(e) =>
              setSlaConfig((p) => ({ ...p, max_transfer_days: parseInt(e.target.value, 10) || 7 }))
            }
          />
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700">
            <div>
              <p className="font-semibold text-slate-200">Eskalasi Otomatis Tiket Overdue</p>
              <p className="text-[11px] text-slate-400">
                Kirim alert merah ke bot jika batas pinjam terlewati
              </p>
            </div>
            <input
              type="checkbox"
              checked={slaConfig.overdue_escalation}
              onChange={(e) =>
                setSlaConfig((p) => ({ ...p, overdue_escalation: e.target.checked }))
              }
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setSlaModalOpen(false)}
            >
              Batal
            </Button>
            <Button variant="primary" fullWidth onClick={handleSaveSla}>
              Simpan SLA
            </Button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        isOpen={tgRoutingModalOpen}
        onClose={() => setTgRoutingModalOpen(false)}
        title="Telegram Multi-Group Routing"
        titleIcon="fa-comments"
        titleIconBg="bg-sky-500/20 text-sky-400"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-400 leading-relaxed">
            Petakan notifikasi mutasi & alert operasional ke grup atau channel Telegram spesifik
            berdasarkan wilayah (Region).
          </p>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {tgRoutes.length === 0 ? (
              <EmptyState
                icon="fa-route"
                title="Belum ada grup rute terdaftar."
                description="Notifikasi saat ini menggunakan default admin chat."
                className="py-4 border-none shadow-none bg-transparent"
              />
            ) : (
              tgRoutes.map((route) => (
                <div
                  key={route.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/90 border border-slate-700"
                >
                  <div>
                    <p className="font-bold text-slate-200">{route.group_name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      ID: {route.chat_id} • Region: {route.region || 'ALL'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteTgRoute(route.id)}
                    className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-all"
                  >
                    <i className="fas fa-trash-alt text-xs" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/80 space-y-2.5">
            <h5 className="font-bold text-slate-300">Tambah Rute Grup Baru</h5>
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Nama Grup"
                placeholder="Grup IT Regional JKT"
                value={newRoute.group_name}
                onChange={(e) => setNewRoute((p) => ({ ...p, group_name: e.target.value }))}
              />
              <Input
                label="Telegram Chat ID"
                placeholder="-1001234567890"
                value={newRoute.chat_id}
                onChange={(e) => setNewRoute((p) => ({ ...p, chat_id: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Region Target
                </label>
                <select
                  value={newRoute.region}
                  onChange={(e) => setNewRoute((p) => ({ ...p, region: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-700 text-slate-200 border border-slate-600 outline-none"
                >
                  <option value="ALL">Semua Region (Global)</option>
                  <option value="JKT">JKT — Jakarta & Tangerang</option>
                  <option value="JATIM">JATIM — Jawa Timur & Bali</option>
                  <option value="JATENG">JATENG — Jawa Tengah & DIY</option>
                  <option value="WEST">WEST — Sumatera & Kepri</option>
                </select>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="self-end"
                onClick={handleAddTgRoute}
              >
                + Tambah
              </Button>
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setTgRoutingModalOpen(false)}
            >
              Tutup
            </Button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        isOpen={gsheetModalOpen}
        onClose={() => setGsheetModalOpen(false)}
        title="Pengaturan Webhook Google Sheets"
        titleIcon="fa-file-excel"
        titleIconBg="bg-emerald-500/20 text-emerald-400"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-400 leading-relaxed">
            Hubungkan Google Apps Script Webhook untuk pencadangan otomatis setiap ada transaksi mutasi
            atau penyelesaian stock opname.
          </p>

          <Input
            label="Google Apps Script Webhook URL"
            placeholder="https://script.google.com/macros/s/.../exec"
            value={gsheetConfig.sheet_url}
            onChange={(e) => setGsheetConfig((p) => ({ ...p, sheet_url: e.target.value }))}
          />

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700">
            <div>
              <p className="font-semibold text-slate-200">Aktifkan Sinkronisasi Otomatis</p>
              <p className="text-[11px] text-slate-400">
                Setiap transaksi berstatus 'Completed' langsung terkirim ke sheet
              </p>
            </div>
            <input
              type="checkbox"
              checked={gsheetConfig.enabled}
              onChange={(e) => setGsheetConfig((p) => ({ ...p, enabled: e.target.checked }))}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setGsheetModalOpen(false)}
            >
              Batal
            </Button>
            <Button variant="primary" fullWidth onClick={handleSaveGsheet}>
              Simpan Webhook
            </Button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        isOpen={templatesModalOpen}
        onClose={() => setTemplatesModalOpen(false)}
        title="Kustomisasi Template Teks"
        titleIcon="fa-file-signature"
        titleIconBg="bg-violet-500/20 text-violet-400"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Header Notifikasi Bot Telegram (HTML)
            </label>
            <textarea
              rows={3}
              value={templates.bot_header}
              onChange={(e) => setTemplates((p) => ({ ...p, bot_header: e.target.value }))}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 text-slate-200 border border-slate-700 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Catatan Kaki BAST Dokumen Cetak
            </label>
            <textarea
              rows={3}
              value={templates.bast_footer_note}
              onChange={(e) =>
                setTemplates((p) => ({ ...p, bast_footer_note: e.target.value }))
              }
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 text-slate-200 border border-slate-700 outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setTemplatesModalOpen(false)}
            >
              Batal
            </Button>
            <Button variant="primary" fullWidth onClick={handleSaveTemplates}>
              Simpan Template
            </Button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        isOpen={masterDataModalOpen}
        onClose={() => setMasterDataModalOpen(false)}
        title="Ringkasan Master Data"
        titleIcon="fa-database"
        titleIconBg="bg-emerald-500/20 text-emerald-400"
      >
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
              <span className="text-xl font-bold text-emerald-400">{sites.length}</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Site / Cabang</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
              <span className="text-xl font-bold text-teal-400">{categories.length}</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Kategori Aset</p>
            </div>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Master Sites dan Master Categories diintegrasikan langsung dengan database Supabase PostgreSQL.
            Untuk mengunggah site atau aset massal, gunakan fitur <b>Import CSV</b> pada navigation header.
          </p>
          <div className="pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setMasterDataModalOpen(false)}
            >
              Tutup
            </Button>
          </div>
        </div>
      </ModalShell>

      {userMgmtOpen && (
        <Suspense fallback={<LoadingSpinner />}>
          <UserManagementModal
            isOpen={userMgmtOpen}
            onClose={() => setUserMgmtOpen(false)}
            sites={sites}
            onShowToast={onShowToast}
            onRefresh={onRefresh}
          />
        </Suspense>
      )}
    </div>
  );
};

export default SettingsView;

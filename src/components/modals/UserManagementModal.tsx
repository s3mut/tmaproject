import React, { useState, useEffect, useMemo } from 'react';
import type { TelegramUser, UserRole, Site, UpsertUserData } from '../../types/inventory';
import { 
  getAllUsers, 
  adminUpsertUser, 
  deleteUser, 
  setUserActiveStatus, 
  approveUserAccess 
} from '../../services/userService';
import { useFormValidation } from '../../hooks/useFormValidation';
import { ModalShell, Button, Input, Select, Textarea } from '../ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sites: Site[];
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
  onRefresh?: () => void;
}

type FilterRole = 'ALL' | 'admin' | 'user' | 'guest' | 'PENDING' | 'INACTIVE';

const UserManagementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  sites = [],
  onShowToast,
  onRefresh,
}) => {
  const [users, setUsers] = useState<TelegramUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterRole>('ALL');

  // State Sub-Modal Tambah/Edit User
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Form State
  const { values, errors, setFieldValue, validate, resetForm } = useFormValidation({
    telegramId: '',
    name: '',
    username: '',
    role: 'user' as UserRole,
    region: 'GLOBAL_ALL',
    isActive: true,
    hasWebAccess: false,
    webPassword: '',
    notes: ''
  });

  // Quick action loading tracking
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (e: any) {
      console.error('Gagal mengambil data user:', e);
      if (onShowToast) onShowToast('❌ Gagal memuat daftar pengguna.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setSearchQuery('');
      setSelectedFilter('ALL');
      setIsFormModalOpen(false);
      setConfirmDeleteId(null);
    }
  }, [isOpen]);

  // Ekstrak daftar unik region dari tabel sites
  const availableRegions = useMemo(() => {
    const regSet = new Set<string>();
    for (const s of sites) {
      if (s.region) regSet.add(s.region.trim());
    }
    return Array.from(regSet).sort();
  }, [sites]);

  // Filter & Search
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Filter role/status
    if (selectedFilter === 'admin') {
      result = result.filter(u => u.role === 'admin');
    } else if (selectedFilter === 'user') {
      result = result.filter(u => u.role === 'user');
    } else if (selectedFilter === 'guest') {
      result = result.filter(u => u.role === 'guest' || !u.role);
    } else if (selectedFilter === 'PENDING') {
      result = result.filter(u => u.notes?.includes('PENDING_APPROVAL'));
    } else if (selectedFilter === 'INACTIVE') {
      result = result.filter(u => u.is_active === false);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(u =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        String(u.telegram_id).includes(q) ||
        (u.assigned_region || '').toLowerCase().includes(q) ||
        (u.notes || '').toLowerCase().includes(q)
      );
    }

    // Urutkan: Pending request selalu paling atas, lalu terbaru
    return result.sort((a, b) => {
      const aPending = a.notes?.includes('PENDING_APPROVAL') ? 1 : 0;
      const bPending = b.notes?.includes('PENDING_APPROVAL') ? 1 : 0;
      if (bPending !== aPending) return bPending - aPending;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [users, searchQuery, selectedFilter]);

  // Total pending count
  const pendingCount = useMemo(() => {
    return users.filter(u => u.notes?.includes('PENDING_APPROVAL')).length;
  }, [users]);

  // Buka modal Tambah Pengguna
  const handleOpenAddModal = () => {
    setIsEditing(false);
    resetForm();
    setIsFormModalOpen(true);
  };

  // Buka modal Edit Hak Akses Pengguna
  const handleOpenEditModal = (user: TelegramUser) => {
    setIsEditing(true);
    resetForm({
      telegramId: String(user.telegram_id),
      name: user.name || '',
      username: user.username || '',
      role: (user.role as UserRole) || 'guest',
      region: user.assigned_region || 'GLOBAL_ALL',
      isActive: user.is_active ?? true,
      hasWebAccess: user.has_web_access ?? false,
      webPassword: '',
      notes: user.notes || ''
    });
    setIsFormModalOpen(true);
  };

  // Simpan Form (Tambah / Edit)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = validate({
      telegramId: (val) => {
        const tid = parseInt(val.trim(), 10);
        if (isNaN(tid) || tid <= 0) return '⚠️ Telegram ID harus berupa angka unik yang valid.';
        return null;
      },
      name: (val) => !val.trim() ? '⚠️ Nama lengkap pengguna wajib diisi.' : null,
      webPassword: (val) => {
        if (values.hasWebAccess && !isEditing && (!val || val.length < 8)) return '⚠️ Password web minimal 8 karakter saat mengaktifkan akses web.';
        if (values.hasWebAccess && isEditing && val && val.length < 8) return '⚠️ Password baru minimal 8 karakter.';
        return null;
      }
    });

    if (!isValid) return;

    const tid = parseInt(values.telegramId.trim(), 10);

    setFormLoading(true);
    try {
      const payload: UpsertUserData = {
        telegram_id: tid,
        name: values.name.trim(),
        username: values.username.trim() || null,
        role: values.role,
        assigned_region: values.role === 'admin' ? null : (values.region === 'GLOBAL_ALL' ? null : values.region),
        is_active: values.isActive,
        has_web_access: values.hasWebAccess,
        web_password: values.webPassword ? values.webPassword.trim() : null,
        notes: values.notes.trim() || null,
      };

      await adminUpsertUser(payload);

      if (onShowToast) {
        onShowToast(
          isEditing 
            ? `✅ Hak akses & data ${values.name} berhasil diperbarui!`
            : `✅ Pengguna baru ${values.name} berhasil ditambahkan!`,
          'success'
        );
      }

      setIsFormModalOpen(false);
      await fetchUsers();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Gagal menyimpan user:', err);
      if (onShowToast) onShowToast(`❌ Gagal menyimpan: ${err.message}`, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Hapus User
  const handleDeleteUser = async (tid: number) => {
    setDeleteLoading(true);
    try {
      const res = await deleteUser(tid);
      if (onShowToast) onShowToast(`✅ ${res.message}`, 'success');
      setConfirmDeleteId(null);
      setIsFormModalOpen(false);
      await fetchUsers();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Gagal menghapus user:', err);
      if (onShowToast) onShowToast(`❌ Gagal menghapus: ${err.message}`, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Quick toggle status aktif
  const handleToggleActive = async (user: TelegramUser) => {
    setActionLoadingId(user.telegram_id);
    const newStatus = !(user.is_active ?? true);
    try {
      await setUserActiveStatus(user.telegram_id, newStatus);
      setUsers(prev => prev.map(u => u.telegram_id === user.telegram_id ? { ...u, is_active: newStatus } : u));
      if (onShowToast) {
        onShowToast(`Akun ${user.name} berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}.`, 'success');
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      if (onShowToast) onShowToast(`❌ Gagal mengubah status: ${err.message}`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick Approval
  const handleQuickApprove = async (user: TelegramUser, role: UserRole) => {
    setActionLoadingId(user.telegram_id);
    try {
      await approveUserAccess(user.telegram_id, role, role === 'user' ? (availableRegions[0] || null) : null);
      if (onShowToast) onShowToast(`✅ Permintaan ${user.name} disetujui sebagai ${role.toUpperCase()}!`, 'success');
      await fetchUsers();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      if (onShowToast) onShowToast(`❌ Gagal menyetujui: ${err.message}`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Manajemen Pengguna & Hak Akses"
        titleIcon="fa-users-gear"
        titleIconBg="bg-indigo-500/20 text-indigo-400"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          {/* Header Action: Search + Tambah Pengguna */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1">
              <Input
                placeholder="Cari nama, @username, Telegram ID, atau region..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon="fa-search"
              />
            </div>
            <Button
              variant="primary"
              icon="fa-user-plus"
              onClick={handleOpenAddModal}
              className="shrink-0 shadow-lg shadow-indigo-500/20"
            >
              Tambah Pengguna
            </Button>
          </div>

          {/* Filter Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setSelectedFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 ${
                selectedFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
              }`}
            >
              Semua ({users.length})
            </button>
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={() => setSelectedFilter('PENDING')}
                className={`px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                  selectedFilter === 'PENDING'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Permintaan ({pendingCount})
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedFilter('admin')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 ${
                selectedFilter === 'admin'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
              }`}
            >
              👑 Admin
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('user')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 ${
                selectedFilter === 'user'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
              }`}
            >
              💼 User IT
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('guest')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 ${
                selectedFilter === 'guest'
                  ? 'bg-slate-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
              }`}
            >
              🔒 Guest
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('INACTIVE')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 ${
                selectedFilter === 'INACTIVE'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
              }`}
            >
              🔴 Nonaktif
            </button>
          </div>

          {/* Banner Penjelasan RBAC */}
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3 flex items-start gap-3">
            <i className="fas fa-shield-halved text-indigo-400 text-base mt-0.5" />
            <div className="text-xs text-indigo-200/90 leading-relaxed">
              <span className="font-bold text-indigo-400">Kontrol Hak Akses Enterprise:</span>{' '}
              Role <strong>Admin</strong> memiliki akses God Mode global. Role <strong>User IT</strong> dibatasi sesuai wilayah (assigned_region). Role <strong>Guest</strong> hanya dapat melihat aset tokonya.
            </div>
          </div>

          {/* Daftar Pengguna */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-700/60 overflow-hidden max-h-[55vh] overflow-y-auto divide-y divide-slate-800">
            {loading ? (
              <div className="p-6 space-y-3">
                <div className="h-16 w-full bg-slate-800 rounded-xl animate-pulse" />
                <div className="h-16 w-full bg-slate-800 rounded-xl animate-pulse" />
                <div className="h-16 w-full bg-slate-800 rounded-xl animate-pulse" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <i className="fas fa-users-slash text-3xl mb-2 text-slate-500 block" />
                Tidak ada pengguna yang sesuai dengan filter/pencarian ini.
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isPendingReq = u.notes?.includes('PENDING_APPROVAL');
                const isUserActive = u.is_active ?? true;
                const isActionBusy = actionLoadingId === u.telegram_id;

                return (
                  <div
                    key={u.telegram_id}
                    className={`p-3.5 transition-colors space-y-3 ${
                      isPendingReq
                        ? 'bg-amber-500/10 border-l-4 border-amber-500'
                        : !isUserActive
                        ? 'bg-slate-900/40 opacity-75'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Baris Atas: Identitas, Badges & Role */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          u.role === 'admin'
                            ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                            : u.role === 'user'
                            ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}>
                          <i className={`fas ${
                            u.role === 'admin' ? 'fa-crown' : u.role === 'user' ? 'fa-user-tie' : 'fa-user'
                          } text-sm`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-50 truncate text-sm">{u.name}</p>
                            {!isUserActive && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                NONAKTIF
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                            <span className="text-blue-400">{u.username ? `@${u.username}` : 'No @username'}</span>
                            <span>•</span>
                            <span>ID: {u.telegram_id}</span>
                          </div>
                        </div>
                      </div>

                      {/* Badges Role & Akses */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          u.role === 'admin' ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' :
                          u.role === 'user'  ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' :
                                               'bg-slate-700/50 text-slate-300 border-slate-600/40'
                        }`}>
                          {u.role === 'admin' ? '👑 ADMIN' : u.role === 'user' ? '💼 USER IT' : '🔒 GUEST'}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          {u.role === 'admin' ? (
                            <span className="text-purple-400/90 font-medium">🌐 Global</span>
                          ) : u.assigned_region ? (
                            <span className="text-amber-400 font-medium">📍 {u.assigned_region}</span>
                          ) : (
                            <span className="text-slate-400 italic">Semua Wilayah</span>
                          )}
                          {u.has_web_access && (
                            <span className="text-emerald-400" title="Akses Web Browser Aktif">
                              <i className="fas fa-globe" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Alert Khusus Jika Permintaan Akses Pending */}
                    {isPendingReq && (
                      <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-2.5 space-y-2">
                        <div className="flex items-start gap-2 text-xs text-amber-300">
                          <i className="fas fa-bell text-amber-400 mt-0.5 shrink-0" />
                          <div className="flex-1 font-medium leading-relaxed">
                            {u.notes}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1 border-t border-amber-500/20">
                          <span className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider">Aksi Cepat:</span>
                          <Button
                            size="sm"
                            variant="primary"
                            icon="fa-check"
                            loading={isActionBusy}
                            disabled={isActionBusy}
                            onClick={() => handleQuickApprove(u, 'user')}
                            className="text-[10px] py-1 px-2.5 h-7"
                          >
                            Setujui User IT
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            icon="fa-crown"
                            loading={isActionBusy}
                            disabled={isActionBusy}
                            onClick={() => handleQuickApprove(u, 'admin')}
                            className="text-[10px] py-1 px-2.5 h-7"
                          >
                            Setujui Admin
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Baris Bawah: Action Buttons */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <div className="text-[11px] text-slate-400">
                        {u.notes && !isPendingReq && (
                          <span className="truncate max-w-[200px] inline-block italic">
                            <i className="fas fa-info-circle mr-1 text-slate-500" />
                            {u.notes}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Quick Toggle Aktif/Nonaktif */}
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={isUserActive ? 'fa-user-slash' : 'fa-user-check'}
                          loading={isActionBusy}
                          disabled={isActionBusy}
                          onClick={() => handleToggleActive(u)}
                          className={`text-xs py-1 px-2.5 h-7.5 ${
                            isUserActive ? 'text-slate-400 hover:text-red-400' : 'text-emerald-400 hover:text-emerald-300'
                          }`}
                        >
                          {isUserActive ? 'Bekukan' : 'Aktifkan'}
                        </Button>

                        {/* Tombol Edit Hak Akses Lengkap */}
                        <Button
                          size="sm"
                          variant="secondary"
                          icon="fa-sliders"
                          onClick={() => handleOpenEditModal(u)}
                          className="text-xs py-1 px-3 h-7.5"
                        >
                          Edit Hak Akses
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 text-xs text-slate-400">
            <span>Total Pengguna: <strong>{users.length}</strong></span>
            <Button variant="secondary" onClick={onClose}>
              Tutup Panel
            </Button>
          </div>
        </div>
      </ModalShell>

      {/* =========================================================================
          SUB-MODAL: FORM TAMBAH & EDIT HAK AKSES PENGGUNA
         ========================================================================= */}
      {isFormModalOpen && (
        <ModalShell
          isOpen={isFormModalOpen}
          onClose={() => !formLoading && setIsFormModalOpen(false)}
          title={isEditing ? 'Edit Hak Akses & Akun' : 'Tambah Pengguna Baru'}
          titleIcon={isEditing ? 'fa-user-gear' : 'fa-user-plus'}
          titleIconBg="bg-blue-500/20 text-blue-400"
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSaveForm} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Telegram ID */}
              <div>
                <Input
                  label="Telegram ID" required
                  type="text"
                  placeholder="Contoh: 123456789 atau 10005"
                  value={values.telegramId}
                  onChange={(e) => setFieldValue('telegramId', e.target.value.replace(/[^0-9]/g, ''))}
                  disabled={isEditing} // ID tidak dapat diubah saat edit
                  error={errors.telegramId}
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {isEditing ? 'Telegram ID permanen (tidak dapat diubah)' : 'ID numerik Telegram atau kode staf'}
                </span>
              </div>

              {/* Username */}
              <div>
                <Input
                  label="Username (@)"
                  type="text"
                  placeholder="Contoh: budi_it (tanpa @)"
                  value={values.username}
                  onChange={(e) => setFieldValue('username', e.target.value.replace('@', ''))}
                  error={errors.username}
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Digunakan untuk lookup dan login web
                </span>
              </div>
            </div>

            {/* Nama Lengkap */}
            <div>
              <Input
                label="Nama Lengkap" required
                type="text"
                placeholder="Nama teknisi / staf..."
                value={values.name}
                onChange={(e) => setFieldValue('name', e.target.value)}
                error={errors.name}
              />
            </div>

            {/* Role & Wilayah Wewenang */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-700/60">
              <div>
                <Select
                  label="Role Hak Akses" required
                  value={values.role}
                  onChange={(e) => setFieldValue('role', e.target.value as UserRole)}
                  className="text-xs py-2"
                  error={errors.role}
                >
                  <option value="guest" className="bg-slate-900 text-slate-50">🔒 Guest (Toko Cabang)</option>
                  <option value="user" className="bg-slate-900 text-slate-50">💼 User IT (Teknisi Regional)</option>
                  <option value="admin" className="bg-slate-900 text-slate-50">👑 Admin (Super Admin Global)</option>
                </Select>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {values.role === 'admin' && 'Akses penuh ke semua modul, approval, dan settings.'}
                  {values.role === 'user' && 'Dapat membuat aset, approve & dispatch mutasi di regionnya.'}
                  {values.role === 'guest' && 'Hanya dapat melihat aset tokonya dan request peminjaman.'}
                </span>
              </div>

              <div>
                <Select
                  label="Wilayah Wewenang (Region)"
                  value={values.region}
                  onChange={(e) => setFieldValue('region', e.target.value)}
                  disabled={values.role === 'admin'}
                  className="text-xs py-2 text-amber-300 border-amber-500/40 disabled:opacity-50"
                  error={errors.region}
                >
                  <option value="GLOBAL_ALL" className="bg-slate-900 text-slate-50">🌐 Semua Wilayah (Global)</option>
                  {availableRegions.map(reg => (
                    <option key={reg} value={reg} className="bg-slate-900 text-slate-50">📍 {reg}</option>
                  ))}
                </Select>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {values.role === 'admin' ? 'Admin otomatis menguasai seluruh region.' : 'Wilayah kerja teknisi IT cabang.'}
                </span>
              </div>
            </div>

            {/* Status Akun & Web Access */}
            <div className="space-y-3 p-3 bg-slate-900/60 rounded-xl border border-slate-700/60">
              {/* Toggle Aktif */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Status Akun Aktif</span>
                  <span className="text-[11px] text-slate-400">Akun nonaktif dibekukan dari sistem</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFieldValue('isActive', !values.isActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    values.isActive ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      values.isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle Akses Web Browser */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Akses Web Login (Browser)</span>
                  <span className="text-[11px] text-slate-400">Izinkan login browser via ID/Username & Password</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFieldValue('hasWebAccess', !values.hasWebAccess)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    values.hasWebAccess ? 'bg-indigo-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      values.hasWebAccess ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Password Web (Muncul jika akses web aktif) */}
              {values.hasWebAccess && (
                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <Input
                    label={isEditing ? 'Ganti Password Web (Opsional)' : 'Password Web (Bcrypt)'}
                    required={!isEditing}
                    type="password"
                    placeholder={isEditing ? 'Kosongkan jika tidak ingin mengubah password...' : 'Minimal 8 karakter...'}
                    value={values.webPassword}
                    onChange={(e) => setFieldValue('webPassword', e.target.value)}
                    error={errors.webPassword}
                  />
                  <span className="text-[10px] text-slate-400 block">
                    Password disimpan aman di database dengan enkripsi Bcrypt.
                  </span>
                </div>
              )}
            </div>

            {/* Catatan / Keterangan */}
            <div>
              <Textarea
                label="Catatan / Keterangan"
                rows={2}
                placeholder="Catatan wewenang, nomor kontak, atau divisi..."
                value={values.notes}
                onChange={(e) => setFieldValue('notes', e.target.value)}
                error={errors.notes}
              />
            </div>

            {/* Konfirmasi Hapus Akun */}
            {isEditing && confirmDeleteId && (
              <div className="p-3 bg-red-500/15 border border-red-500/40 rounded-xl space-y-2">
                <p className="text-xs text-red-300 font-bold">
                  <i className="fas fa-triangle-exclamation mr-1.5" />
                  Yakin ingin menghapus akun {values.name}?
                </p>
                <p className="text-[11px] text-red-200/80 leading-relaxed">
                  Jika pengguna memiliki riwayat transaksi atau audit opname, akun otomatis dinonaktifkan (soft delete) untuk menjaga integritas data.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    loading={deleteLoading}
                    disabled={deleteLoading}
                    onClick={() => handleDeleteUser(parseInt(values.telegramId, 10))}
                  >
                    Ya, Hapus Akun
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={deleteLoading}
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Batal
                  </Button>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-700/60">
              <div>
                {isEditing && !confirmDeleteId && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    icon="fa-trash"
                    onClick={() => setConfirmDeleteId(parseInt(values.telegramId, 10))}
                  >
                    Hapus
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsFormModalOpen(false)}
                  disabled={formLoading}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  icon="fa-save"
                  loading={formLoading}
                  disabled={formLoading}
                >
                  {isEditing ? 'Simpan Perubahan' : 'Tambah Pengguna'}
                </Button>
              </div>
            </div>
          </form>
        </ModalShell>
      )}
    </>
  );
};

export default UserManagementModal;


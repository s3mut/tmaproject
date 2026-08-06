import React, { useState, useEffect, useMemo } from 'react';
import type { TelegramUser, UserRole, Site } from '../../types/inventory';
import { getAllUsers, updateUserRoleAndRegion } from '../../services/userService';
import { ModalShell, Button, Input, Select } from '../ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sites: Site[];
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
  onRefresh?: () => void;
}

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
  const [savingId, setSavingId] = useState<number | null>(null);

  // State lokal untuk menyimpan form perubahan sementara: { [telegramId]: { role, assigned_region } }
  const [editState, setEditState] = useState<Record<number, { role: UserRole; assigned_region: string | null }>>({});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
      const initialEdit: Record<number, { role: UserRole; assigned_region: string | null }> = {};
      for (const u of data) {
        initialEdit[u.telegram_id] = {
          role: (u.role as UserRole) || 'guest',
          assigned_region: u.assigned_region ?? null,
        };
      }
      setEditState(initialEdit);
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

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      String(u.telegram_id).includes(q) ||
      (u.assigned_region || '').toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const handleRoleChange = (id: number, newRole: UserRole) => {
    setEditState(prev => ({
      ...prev,
      [id]: {
        role: newRole,
        assigned_region: newRole === 'user' ? (prev[id]?.assigned_region || availableRegions[0] || 'JKT') : null,
      }
    }));
  };

  const handleRegionChange = (id: number, newRegion: string) => {
    setEditState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        assigned_region: newRegion === 'GLOBAL_ALL' ? null : newRegion,
      }
    }));
  };

  const handleSaveUser = async (user: TelegramUser) => {
    const currentEdit = editState[user.telegram_id];
    if (!currentEdit) return;

    setSavingId(user.telegram_id);
    try {
      await updateUserRoleAndRegion(user.telegram_id, currentEdit.role, currentEdit.assigned_region);
      if (onShowToast) onShowToast(`✅ Hak akses & region untuk ${user.name} berhasil diperbarui!`, 'success');
      // Update state local user agar indikator "tersimpan" selaras
      setUsers(prev => prev.map(u => u.telegram_id === user.telegram_id ? { ...u, role: currentEdit.role, assigned_region: currentEdit.assigned_region } : u));
      if (onRefresh) onRefresh();
    } catch (e: any) {
      console.error('Error updating user:', e);
      if (onShowToast) onShowToast(`❌ Gagal memperbarui wewenang: ${e.message}`, 'error');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Manajemen Akun & Region IT (Admin)"
      titleIcon="fa-users-cog"
      titleIconBg="bg-indigo-500/20 text-indigo-400"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Banner Penjelasan RBAC */}
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3.5 flex items-start gap-3">
          <i className="fas fa-sitemap text-indigo-400 text-lg mt-0.5" />
          <div className="text-xs text-indigo-200/90 leading-relaxed">
            <span className="font-bold block text-indigo-400 mb-0.5">Otoritas Wilayah & Role (Enterprise RBAC)</span>
            Atur wewenang wilayah (<strong>assigned_region</strong>) untuk setiap teknisi IT cabang (role: <code>user</code>). Teknisi hanya dapat menyetujui dan mengirimkan barang untuk toko di dalam region mereka sendiri. Role <code>admin</code> memiliki kendali atas seluruh region (Global).
          </div>
        </div>

        {/* Pencarian User */}
        <Input
          placeholder="Cari nama pengguna, username, ID, atau region..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon="fa-search"
        />

        {/* Daftar Pengguna */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-700/60 overflow-hidden max-h-[60vh] overflow-y-auto divide-y divide-slate-800">
          <div className="bg-slate-800/80 px-4 py-2.5 text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">
            Daftar Pengguna & Hak Akses
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              <div className="h-10 w-full bg-slate-800 rounded-xl animate-pulse" />
              <div className="h-10 w-full bg-slate-800 rounded-xl animate-pulse" />
              <div className="h-10 w-full bg-slate-800 rounded-xl animate-pulse" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <i className="fas fa-users-slash text-2xl mb-2 text-slate-500 block" />
              Tidak ada pengguna yang ditemukan dengan kata kunci "{searchQuery}"
            </div>
          ) : (
            filteredUsers.map((u) => {
              const currentEdit = editState[u.telegram_id] || { role: u.role, assigned_region: u.assigned_region };
              const isModified = currentEdit.role !== u.role || currentEdit.assigned_region !== (u.assigned_region || null);

              return (
                <div key={u.telegram_id} className="px-4 py-3 hover:bg-slate-800/40 transition-colors space-y-2.5">
                  {/* Baris Atas: Identitas + Badge Role */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate text-sm">{u.name}</p>
                      <p className="text-[11px] text-blue-400 font-mono mt-0.5">
                        {u.username ? `@${u.username}` : `ID: ${u.telegram_id}`}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      currentEdit.role === 'admin' ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' :
                      currentEdit.role === 'user'  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                                                     'bg-slate-500/15 text-slate-400 border-slate-500/30'
                    }`}>
                      {currentEdit.role === 'admin' ? '👑 ADMIN' : currentEdit.role === 'user' ? '💼 USER' : '🔒 GUEST'}
                    </span>
                  </div>

                  {/* Baris Tengah: Selector Role + Region */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Role Akses</p>
                      <Select
                        value={currentEdit.role}
                        onChange={(e) => handleRoleChange(u.telegram_id, e.target.value as UserRole)}
                        className="text-xs py-1.5"
                      >
                        <option value="guest" className="bg-slate-900 text-white">🔒 Guest</option>
                        <option value="user" className="bg-slate-900 text-white">💼 User IT</option>
                        <option value="admin" className="bg-slate-900 text-white">👑 Admin</option>
                      </Select>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Region</p>
                      {currentEdit.role === 'user' ? (
                        <Select
                          value={currentEdit.assigned_region || 'GLOBAL_ALL'}
                          onChange={(e) => handleRegionChange(u.telegram_id, e.target.value)}
                          className="text-xs py-1.5 text-amber-300 border-amber-500/40"
                        >
                          <option value="GLOBAL_ALL" className="bg-slate-900 text-white">🌐 Semua Wilayah</option>
                          {availableRegions.map(reg => (
                            <option key={reg} value={reg} className="bg-slate-900 text-white">📍 {reg}</option>
                          ))}
                        </Select>
                      ) : (
                        <div className="h-8 flex items-center">
                          <span className="text-[11px] text-slate-500 italic">
                            {currentEdit.role === 'admin' ? '🌐 God Mode (Semua)' : '🏪 Mengikuti Toko'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Baris Bawah: Tombol Simpan */}
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant={isModified ? 'primary' : 'secondary'}
                      icon={savingId === u.telegram_id ? undefined : (isModified ? 'fa-save' : 'fa-check')}
                      loading={savingId === u.telegram_id}
                      disabled={!isModified || savingId === u.telegram_id}
                      onClick={() => handleSaveUser(u)}
                    >
                      {isModified ? 'Simpan Perubahan' : 'Tersimpan'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-700/60">
          <Button variant="secondary" onClick={onClose}>
            Tutup Panel
          </Button>
        </div>
      </div>
    </ModalShell>
  );
};

export default UserManagementModal;

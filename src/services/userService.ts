import { supabase } from '../lib/supabase';
import type { TelegramUser, UserRole, UpsertUserData } from '../types/inventory';

export interface TelegramSDKUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

/**
 * Membaca data pengguna Telegram aktual dari Telegram WebApp SDK
 */
export function getTelegramSDKUser(): TelegramSDKUser {
  try {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      return window.Telegram.WebApp.initDataUnsafe.user;
    }
  } catch (e) {
    console.warn('[TMA] Gagal membaca Telegram SDK user:', e);
  }

  // Fallback untuk pengujian di browser biasa (bukan di Telegram)
  return {
    id: 999999999,
    first_name: 'Admin',
    last_name: 'IT',
    username: 'admin_it',
  };
}

/**
 * Sinkronisasi/Fetch data user dari Supabase `telegram_users`.
 * Jika user belum terdaftar, otomatis buatkan entry baru dengan role 'guest'.
 */
export async function syncTelegramUser(): Promise<TelegramUser> {
  const sdkUser = getTelegramSDKUser();
  const displayName = [sdkUser.first_name, sdkUser.last_name].filter(Boolean).join(' ') || sdkUser.username || `User ${sdkUser.id}`;

  // 1. Cek apakah user sudah terdaftar di Supabase
  const { data: existingUser, error: fetchErr } = await supabase
    .from('telegram_users')
    .select('*')
    .eq('telegram_id', sdkUser.id)
    .single();

  if (existingUser && !fetchErr) {
    // Sinkronisasi ulang username jika ada perubahan di sisi Telegram atau jika sebelumnya kosong
    const currentSdkUsername = sdkUser.username || null;
    if (existingUser.username !== currentSdkUsername) {
      const { error: rpcErr } = await supabase.rpc('sync_telegram_username', {
        p_telegram_id: sdkUser.id,
        p_username: currentSdkUsername
      });
      
      if (!rpcErr) {
        existingUser.username = currentSdkUsername;
      } else {
        console.warn('Gagal sync username (RPC mungkin belum ada):', rpcErr.message);
      }
    }

    return existingUser as TelegramUser;
  }

  // 2. Jika belum terdaftar, daftarkan otomatis sebagai 'guest'
  const newUser: Partial<TelegramUser> = {
    telegram_id: sdkUser.id,
    name: displayName,
    username: sdkUser.username || null,
    role: 'guest',
    is_active: true,
    notes: 'Terdaftar otomatis dari TMA',
  };

  const { data: insertedUser, error: insertErr } = await supabase
    .from('telegram_users')
    .insert([newUser])
    .select()
    .single();

  if (insertErr) {
    console.error('Error auto-registering telegram user:', insertErr);
    // Fallback jika insert gagal karena RLS atau offline
    return {
      telegram_id: sdkUser.id,
      name: displayName,
      username: sdkUser.username || null,
      role: 'guest',
      is_active: true,
      notes: null,
      created_at: new Date().toISOString(),
    };
  }

  return insertedUser as TelegramUser;
}

/**
 * Helper untuk meng-escape karakter khusus HTML
 */
function escapeHtml(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Mengirim notifikasi pengajuan akses ke grup/chat Admin IT di Telegram.
 * Prioritas 1: Supabase Edge Function `telegram-bot/request-access` (Aman, token di server)
 * Prioritas 2: Fallback Client-side HTTP (jika token env client diset)
 */
export async function requestITAccess(
  user: TelegramUser,
  noteText: string,
  botToken?: string,
  adminChatId?: string
): Promise<{ success: boolean; message: string; details?: unknown }> {
  const sdkUser = getTelegramSDKUser();
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  const updatedNote = `PENDING_APPROVAL: ${noteText || 'Request akses Tim IT'} (${timestamp})`;

  // 1. Update status/catatan request di Supabase telegram_users
  const { error: dbErr } = await supabase
    .from('telegram_users')
    .upsert({
      telegram_id: user.telegram_id,
      name: user.name,
      username: sdkUser.username || user.username || null,
      role: 'guest',
      notes: updatedNote,
      is_active: true,
    }, { onConflict: 'telegram_id' });

  if (dbErr) {
    console.error('[UserService] Gagal menyimpan request ke Supabase:', dbErr);
  }

  // 2. Invoke Supabase Edge Function (Metode Utama & Aman)
  try {
    const payload = {
      telegram_id: user.telegram_id,
      name: user.name,
      username: sdkUser.username || user.username || null,
      note: noteText || 'Request akses Tim IT',
    };

    // Panggil endpoint /request-access
    const { data: fnData, error: fnError } = await supabase.functions.invoke('telegram-bot/request-access', {
      body: payload,
    });

    if (fnError) {
      let errorBody: unknown = null;
      try {
        errorBody = await (fnError as any).context?.json?.();
      } catch {
        // ignore
      }

      console.error('[UserService] Gagal memanggil Edge Function telegram-bot/request-access:', {
        message: fnError.message,
        status: (fnError as any).context?.status,
        body: errorBody,
      });

      // Coba fallback dengan query body `action: 'request-access'` jika routing URL gagal
      const { data: fnFallbackData, error: fnFallbackErr } = await supabase.functions.invoke('telegram-bot', {
        body: { action: 'request-access', ...payload },
      });

      if (fnFallbackErr) {
        console.error('[UserService] Fallback action request-access juga gagal:', fnFallbackErr);
      } else if (fnFallbackData) {
        console.log('[UserService] Berhasil via fallback action request-access:', fnFallbackData);
        return {
          success: true,
          message: 'Pengajuan akses berhasil dikirim ke Admin IT via Telegram!',
          details: fnFallbackData,
        };
      }
    } else {
      console.log('[UserService] Sukses invoke telegram-bot/request-access:', fnData);
      return {
        success: true,
        message: 'Pengajuan akses berhasil dikirim ke Admin IT via Telegram!',
        details: fnData,
      };
    }
  } catch (invokeEx) {
    console.error('[UserService] Exception saat invoke edge function:', invokeEx);
  }

  // 3. Fallback Client-side jika botToken atau VITE_TELEGRAM_BOT_TOKEN tersedia
  const activeBotToken = botToken || (import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string);
  const activeAdminChatId = adminChatId || (import.meta.env.VITE_TELEGRAM_ADMIN_CHAT_ID as string);

  if (activeBotToken && activeAdminChatId) {
    try {
      const usernameFormatted = sdkUser.username ? `@${escapeHtml(sdkUser.username)}` : '<i>Tanpa Username</i>';
      const botMessage =
        `🔔 <b>REQUEST AKSES TIM IT BARU</b>\n\n` +
        `👤 <b>Nama:</b> ${escapeHtml(user.name)}\n` +
        `🏷️ <b>Username:</b> ${usernameFormatted}\n` +
        `🆔 <b>Telegram ID:</b> <code>${user.telegram_id}</code>\n` +
        `📝 <b>Catatan/Alasan:</b> ${escapeHtml(noteText || '-')}\n` +
        `📅 <b>Waktu:</b> ${timestamp}\n\n` +
        `<i>Silakan pilih tindakan persetujuan role:</i>`;

      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: '✅ Setujui (User)', callback_data: `APPROVE_USER:${user.telegram_id}` },
            { text: '👑 Setujui (Admin)', callback_data: `APPROVE_ADMIN:${user.telegram_id}` },
          ],
          [
            { text: '❌ Tolak Permintaan', callback_data: `REJECT_USER:${user.telegram_id}` },
          ],
        ],
      };

      const res = await fetch(`https://api.telegram.org/bot${activeBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: activeAdminChatId,
          text: botMessage,
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard,
        }),
      });

      const resData = await res.json();
      if (!resData.ok) {
        console.error('[UserService] Client-side sendMessage failed:', {
          error_code: resData.error_code,
          description: resData.description,
        });
      } else {
        console.log('[UserService] Client-side sendMessage berhasil:', resData);
      }
    } catch (botErr) {
      console.error('[UserService] Error sending direct Telegram notification:', botErr);
    }
  }

  return {
    success: true,
    message: 'Pengajuan akses tersimpan. Jika notifikasi bot belum masuk, pastikan Edge Function aktif & Secrets telah dikonfigurasi.',
  };
}

/**
 * Menguji konektivitas Telegram Bot API melalui Supabase Edge Function `/test`
 */
export async function testBotNotification(
  targetChatId?: string | number
): Promise<{ success: boolean; message: string; details?: unknown }> {
  try {
    const { data, error } = await supabase.functions.invoke('telegram-bot/test', {
      body: { chat_id: targetChatId },
    });

    if (error) {
      let bodyDetail: unknown = null;
      try {
        bodyDetail = await (error as any).context?.json?.();
      } catch {
        // ignore
      }

      console.error('[UserService] Gagal test bot notification:', {
        message: error.message,
        status: (error as any).context?.status,
        body: bodyDetail,
      });

      return {
        success: false,
        message: `Gagal mengirim tes notifikasi: ${error.message}`,
        details: bodyDetail,
      };
    }

    return {
      success: data?.success ?? true,
      message: data?.success
        ? 'Pesan tes berhasil dikirim ke Telegram!'
        : `Gagal: ${data?.error || 'Unknown error'}`,
      details: data,
    };  } catch (err: unknown) {
    const errStr = err instanceof Error ? err.message : String(err);
    console.error('[UserService] Exception in testBotNotification:', errStr);
    return {
      success: false,
      message: `Exception: ${errStr}`,
    };
  }
}

/**
 * Update role pengguna (digunakan Admin dari UI atau webhook)
 */
export async function updateUserRole(telegramId: number, newRole: UserRole): Promise<void> {
  const { error } = await supabase
    .from('telegram_users')
    .update({ role: newRole, notes: `Role updated to ${newRole}` })
    .eq('telegram_id', telegramId);

  if (error) {
    throw new Error(`Gagal mengubah role user: ${error.message}`);
  }
}

/**
 * Ambil daftar seluruh user (Untuk keperluan panel Admin)
 */
export async function getAllUsers(): Promise<TelegramUser[]> {
  const { data, error } = await supabase
    .from('telegram_users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Gagal mengambil daftar user:', error);
    return [];
  }
  return data as TelegramUser[];
}


/**
 * Update role dan wilayah wewenang (assigned_region) pengguna oleh Admin
 */
export async function updateUserRoleAndRegion(
  telegramId: number,
  newRole: UserRole,
  assignedRegion: string | null
): Promise<void> {
  const { error } = await supabase
    .from('telegram_users')
    .update({
      role: newRole,
      assigned_region: newRole === 'user' ? assignedRegion : null,
      notes: `Updated role to ${newRole}${newRole === 'user' ? ` (Region: ${assignedRegion || 'All'})` : ''}`,
    })
    .eq('telegram_id', telegramId);

  if (error) {
    throw new Error(`Gagal memperbarui role & wewenang user: ${error.message}`);
  }
}

/**
 * Menghitung jumlah pengguna yang sedang mengajukan permintaan akses (PENDING_APPROVAL)
 */
export async function getPendingUsersCount(): Promise<number> {
  const { count, error } = await supabase
    .from('telegram_users')
    .select('*', { count: 'exact', head: true })
    .ilike('notes', '%PENDING_APPROVAL%');
  
  if (error) {
    console.error('Gagal hitung pending users:', error);
    return 0;
  }
  return count || 0;
}

/**
 * Tambah atau Edit Pengguna beserta Hak Akses (Admin)
 * Menggunakan RPC admin_upsert_user (SECURITY DEFINER) dengan fallback direct upsert.
 */
export async function adminUpsertUser(userData: UpsertUserData): Promise<TelegramUser> {
  const cleanUsername = userData.username ? userData.username.replace('@', '').trim().toLowerCase() : null;
  const cleanRegion = (userData.role === 'admin' || userData.assigned_region === 'GLOBAL_ALL') ? null : (userData.assigned_region || null);

  // 1. Coba via RPC admin_upsert_user
  try {
    const { data, error } = await supabase.rpc('admin_upsert_user', {
      p_telegram_id: userData.telegram_id,
      p_name: userData.name.trim(),
      p_username: cleanUsername,
      p_role: userData.role,
      p_assigned_region: cleanRegion,
      p_is_active: userData.is_active ?? true,
      p_has_web_access: userData.has_web_access ?? false,
      p_web_password: userData.web_password || null,
      p_notes: userData.notes || null,
    });

    if (!error && data && data.length > 0) {
      const row = data[0];
      return {
        telegram_id: row.telegram_id,
        name: row.name,
        username: row.username,
        role: row.role as UserRole,
        assigned_region: row.assigned_region,
        is_active: row.is_active,
        has_web_access: row.has_web_access,
        notes: row.notes,
        created_at: row.created_at,
      };
    }
  } catch (rpcErr) {
    console.warn('[UserService] RPC admin_upsert_user error, fallback to direct query:', rpcErr);
  }

  // 2. Fallback direct upsert
  const payload: Record<string, any> = {
    telegram_id: userData.telegram_id,
    name: userData.name.trim(),
    username: cleanUsername,
    role: userData.role,
    assigned_region: cleanRegion,
    is_active: userData.is_active ?? true,
    has_web_access: userData.has_web_access ?? false,
    notes: userData.notes || null,
  };

  const { data: upsertData, error: upsertErr } = await supabase
    .from('telegram_users')
    .upsert(payload, { onConflict: 'telegram_id' })
    .select()
    .single();

  if (upsertErr) {
    throw new Error(`Gagal menyimpan data pengguna: ${upsertErr.message}`);
  }

  // Jika web_password diisi dan akses web aktif, panggil RPC set_web_password
  if (userData.has_web_access && userData.web_password && userData.web_password.length >= 8) {
    try {
      await supabase.rpc('set_web_password', {
        p_telegram_id: userData.telegram_id,
        p_new_password: userData.web_password,
      });
    } catch (pwErr) {
      console.warn('[UserService] Gagal set web password via RPC:', pwErr);
    }
  } else if (!userData.has_web_access) {
    try {
      await supabase.rpc('remove_web_access', {
        p_telegram_id: userData.telegram_id,
      });
    } catch {
      // ignore
    }
  }

  return upsertData as TelegramUser;
}

/**
 * Hapus pengguna dari database.
 * Jika memiliki relasi transaksi/opname, otomatis dialihkan ke soft-delete (is_active = false).
 */
export async function deleteUser(
  telegramId: number
): Promise<{ success: boolean; soft_deleted: boolean; message: string }> {
  // 1. Coba via RPC admin_delete_user
  try {
    const { data, error } = await supabase.rpc('admin_delete_user', {
      p_telegram_id: telegramId,
    });

    if (!error && data) {
      return data;
    }
  } catch (rpcErr) {
    console.warn('[UserService] RPC admin_delete_user error, fallback to direct query:', rpcErr);
  }

  // 2. Fallback direct delete
  const { error: delErr } = await supabase
    .from('telegram_users')
    .delete()
    .eq('telegram_id', telegramId);

  if (!delErr) {
    return {
      success: true,
      soft_deleted: false,
      message: 'Pengguna berhasil dihapus secara permanen.',
    };
  }

  // Jika error karena foreign key constraint, fallback ke soft delete (is_active = false)
  const { error: softErr } = await supabase
    .from('telegram_users')
    .update({
      is_active: false,
      has_web_access: false,
      notes: 'Akun dinonaktifkan oleh Admin',
    })
    .eq('telegram_id', telegramId);

  if (softErr) {
    throw new Error(`Gagal menghapus pengguna: ${delErr.message}`);
  }

  return {
    success: true,
    soft_deleted: true,
    message: 'Pengguna memiliki riwayat transaksi dan telah dinonaktifkan (soft delete).',
  };
}

/**
 * Toggle cepat status aktif/nonaktif akun pengguna
 */
export async function setUserActiveStatus(telegramId: number, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('telegram_users')
    .update({ is_active: isActive })
    .eq('telegram_id', telegramId);

  if (error) {
    throw new Error(`Gagal mengubah status aktif: ${error.message}`);
  }
}

/**
 * Setujui permintaan akses secara instan
 */
export async function approveUserAccess(
  telegramId: number,
  approvedRole: UserRole = 'user',
  region: string | null = null
): Promise<void> {
  const { error } = await supabase
    .from('telegram_users')
    .update({
      role: approvedRole,
      assigned_region: approvedRole === 'user' ? region : null,
      notes: `Disetujui sebagai ${approvedRole}${region ? ` (Region: ${region})` : ''}`,
      is_active: true,
    })
    .eq('telegram_id', telegramId);

  if (error) {
    throw new Error(`Gagal menyetujui permintaan akses: ${error.message}`);
  }
}



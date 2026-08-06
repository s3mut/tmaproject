import { supabase } from '../lib/supabase';
import type { TelegramUser, UserRole } from '../types/inventory';

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
      await supabase
        .from('telegram_users')
        .update({ username: currentSdkUsername })
        .eq('telegram_id', sdkUser.id);
        
      existingUser.username = currentSdkUsername;
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
 * Mengirim notifikasi pengajuan akses ke grup/chat Admin IT di Telegram via Bot API
 */
export async function requestITAccess(
  user: TelegramUser,
  noteText: string,
  botToken?: string,
  adminChatId?: string
): Promise<{ success: boolean; message: string }> {
  const sdkUser = getTelegramSDKUser();
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  const usernameFormatted = sdkUser.username ? `@${sdkUser.username}` : 'Tanpa Username';
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
    console.error('Gagal menyimpan request ke Supabase:', dbErr);
  }

  // Ambil token bot & admin chat id dari env jika ada
  const activeBotToken = botToken || (import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string);
  const activeAdminChatId = adminChatId || (import.meta.env.VITE_TELEGRAM_ADMIN_CHAT_ID as string);

  // 2. Jika Bot Token & Admin Chat ID tersedia, kirim notifikasi pesan interaktif + inline keyboard
  if (activeBotToken && activeAdminChatId) {
    try {
      const botMessage = `🔔 *REQUEST AKSES TIM IT BARU*\n\n` +
        `👤 *Nama*: ${user.name}\n` +
        `🏷️ *Username*: ${usernameFormatted}\n` +
        `🆔 *Telegram ID*: \`${user.telegram_id}\`\n` +
        `📝 *Catatan/Alasan*: ${noteText || '-'}\n` +
        `📅 *Waktu*: ${timestamp}\n\n` +
        ` Silakan pilih tindakan untuk persetujuan role:`;

      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: '✅ Setujui (User)', callback_data: `approve_user_${user.telegram_id}` },
            { text: '👑 Setujui (Admin)', callback_data: `approve_admin_${user.telegram_id}` }
          ],
          [
            { text: '❌ Tolak Permintaan', callback_data: `reject_${user.telegram_id}` }
          ]
        ]
      };

      const res = await fetch(`https://api.telegram.org/bot${activeBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: activeAdminChatId,
          text: botMessage,
          parse_mode: 'Markdown',
          reply_markup: inlineKeyboard
        })
      });

      const resData = await res.json();
      if (!resData.ok) {
        console.warn('Bot sendMessage warn:', resData.description);
      }
    } catch (botErr) {
      console.error('Error sending Telegram Bot notification:', botErr);
    }
  }

  return {
    success: true,
    message: 'Pengajuan akses berhasil dikirim ke Admin IT! Mohon tunggu konfirmasi.'
  };
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

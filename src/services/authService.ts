import { supabase } from '../lib/supabase';
import type { TelegramUser } from '../types/inventory';

/**
 * Deteksi apakah app sedang berjalan dalam konteks Telegram Mini App
 */
export function isTelegramContext(): boolean {
  try {
    return !!(
      window.Telegram?.WebApp?.initDataUnsafe?.user?.id
    );
  } catch {
    return false;
  }
}

/**
 * Autentikasi web: verifikasi Telegram ID + password via Supabase RPC.
 * Password diproses di server menggunakan bcrypt — hash tidak pernah expose ke client.
 */
export async function verifyWebLogin(
  telegramId: number,
  password: string
): Promise<TelegramUser> {
  if (!telegramId || !password) {
    throw new Error('Telegram ID dan password wajib diisi.');
  }

  const { data, error } = await supabase.rpc('verify_web_login', {
    p_telegram_id: telegramId,
    p_password: password,
  });

  if (error) {
    throw new Error(`Gagal verifikasi login: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Telegram ID atau password salah, atau akun belum memiliki akses web.');
  }

  const row = data[0];
  return {
    telegram_id: row.telegram_id,
    name: row.name,
    role: row.role as TelegramUser['role'],
    is_active: row.is_active,
    notes: row.notes,
    created_at: row.created_at,
  };
}

/**
 * Set / ubah password web untuk user.
 * Dipanggil oleh user yang sudah login via Telegram.
 */
export async function setWebPassword(
  telegramId: number,
  newPassword: string
): Promise<void> {
  if (newPassword.length < 8) {
    throw new Error('Password minimal 8 karakter.');
  }

  const { data, error } = await supabase.rpc('set_web_password', {
    p_telegram_id: telegramId,
    p_new_password: newPassword,
  });

  if (error) {
    throw new Error(`Gagal set password: ${error.message}`);
  }
  if (!data) {
    throw new Error('User tidak ditemukan atau tidak aktif.');
  }
}

/**
 * Hapus akses web user (reset web_password ke NULL).
 */
export async function removeWebAccess(telegramId: number): Promise<void> {
  const { error } = await supabase.rpc('remove_web_access', {
    p_telegram_id: telegramId,
  });
  if (error) throw new Error(`Gagal hapus akses web: ${error.message}`);
}

// ── Session Storage Keys ──────────────────────────────────────────────────────
const SESSION_KEY = 'transittma_web_session';

export interface WebSession {
  telegramId: number;
  name: string;
  role: string;
  loggedAt: number;
}

export function saveWebSession(user: TelegramUser): void {
  const session: WebSession = {
    telegramId: user.telegram_id,
    name: user.name,
    role: user.role,
    loggedAt: Date.now(),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadWebSession(): WebSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WebSession;
  } catch {
    return null;
  }
}

export function clearWebSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

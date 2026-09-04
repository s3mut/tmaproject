import { supabase } from '../lib/supabase';
import type { SystemSetting, TelegramGroupRoute } from '../types/inventory';

/**
 * Mengambil satu nilai konfigurasi dinamis berdasarkan key
 */
export async function getSystemSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error || !data) {
      return defaultValue;
    }
    return (data.value as T) ?? defaultValue;
  } catch (err) {
    console.error(`[SettingsService] Gagal membaca setting ${key}:`, err);
    return defaultValue;
  }
}

/**
 * Mengambil seluruh konfigurasi sistem
 */
export async function getAllSystemSettings(): Promise<SystemSetting[]> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('key', { ascending: true });

    if (error || !data) {
      return [];
    }
    return data as SystemSetting[];
  } catch (err) {
    console.error('[SettingsService] Gagal membaca seluruh settings:', err);
    return [];
  }
}

/**
 * Menyimpan / memperbarui konfigurasi sistem (Key-Value JSONB)
 */
export async function updateSystemSetting<T>(
  key: string,
  value: T,
  updatedBy?: number | null,
  description?: string
): Promise<boolean> {
  try {
    const payload: Partial<SystemSetting> = {
      key,
      value: value as any,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy ?? null,
    };
    if (description) {
      payload.description = description;
    }

    const { error } = await supabase
      .from('system_settings')
      .upsert(payload, { onConflict: 'key' });

    if (error) {
      console.error(`[SettingsService] Gagal update setting ${key}:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[SettingsService] Exception update setting ${key}:`, err);
    return false;
  }
}

/**
 * Mengambil daftar seluruh rute grup Telegram
 */
export async function getTelegramGroupRoutes(): Promise<TelegramGroupRoute[]> {
  try {
    const { data, error } = await supabase
      .from('telegram_group_routes')
      .select('*')
      .order('id', { ascending: true });

    if (error || !data) {
      return [];
    }
    return data as TelegramGroupRoute[];
  } catch (err) {
    console.error('[SettingsService] Gagal fetch telegram_group_routes:', err);
    return [];
  }
}

/**
 * Tambah atau update rute grup Telegram
 */
export async function upsertTelegramGroupRoute(
  route: Partial<TelegramGroupRoute>
): Promise<boolean> {
  try {
    const payload = {
      ...route,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('telegram_group_routes')
      .upsert(payload);

    if (error) {
      console.error('[SettingsService] Gagal upsert route grup:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[SettingsService] Exception upsert route grup:', err);
    return false;
  }
}

/**
 * Hapus rute grup Telegram berdasarkan ID
 */
export async function deleteTelegramGroupRoute(id: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('telegram_group_routes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[SettingsService] Gagal delete route grup:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[SettingsService] Exception delete route grup:', err);
    return false;
  }
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { TelegramUser } from '../types/inventory';
import {
  isTelegramContext,
  verifyWebLogin,
  saveWebSession,
  loadWebSession,
  clearWebSession,
} from '../services/authService';
import { syncTelegramUser } from '../services/userService';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AuthMethod = 'telegram' | 'web' | null;

export interface AuthState {
  currentUser: TelegramUser | null;
  authMethod: AuthMethod;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  loginWithWeb: (telegramId: number, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<TelegramUser | null>(null);
  const [authMethod, setAuthMethod]   = useState<AuthMethod>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // ── Inisialisasi auth saat mount ─────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 1. Cek apakah running di Telegram Mini App
        if (isTelegramContext()) {
          // Auto-login: sync user dari Telegram SDK ke Supabase
          const user = await syncTelegramUser();
          setCurrentUser(user);
          setAuthMethod('telegram');
          return;
        }

        // 2. Tidak di Telegram → cek apakah ada web session tersimpan
        const session = loadWebSession();
        if (session) {
          // Re-fetch user terbaru dari Supabase agar role selalu up-to-date
          const { supabase } = await import('../lib/supabase');
          const { data } = await supabase
            .from('telegram_users')
            .select('*')
            .eq('telegram_id', session.telegramId)
            .eq('is_active', true)
            .single();

          if (data) {
            setCurrentUser(data as TelegramUser);
            setAuthMethod('web');
            return;
          }
          // Session tidak valid → hapus
          clearWebSession();
        }

        // 3. Tidak ada auth → tampilkan halaman login
        setCurrentUser(null);
        setAuthMethod(null);
      } catch (err: any) {
        console.error('[AuthContext] Init error:', err);
        setError(err.message || 'Gagal menginisialisasi sesi.');
        setCurrentUser(null);
        setAuthMethod(null);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // ── Login via web form ────────────────────────────────────────────────────
  const loginWithWeb = useCallback(async (telegramId: number, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await verifyWebLogin(telegramId, password);
      saveWebSession(user);
      setCurrentUser(user);
      setAuthMethod('web');
    } catch (err: any) {
      setError(err.message);
      throw err; // Re-throw agar LoginView bisa tangkap & tampilkan
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    clearWebSession();
    setCurrentUser(null);
    setAuthMethod(null);
    setError(null);
  }, []);

  // ── Refresh user data dari Supabase (misal: setelah role berubah) ─────────
  const refreshUser = useCallback(async () => {
    if (!currentUser) return;
    try {
      const { supabase } = await import('../lib/supabase');
      const { data } = await supabase
        .from('telegram_users')
        .select('*')
        .eq('telegram_id', currentUser.telegram_id)
        .single();
      if (data) setCurrentUser(data as TelegramUser);
    } catch (err) {
      console.error('[AuthContext] refreshUser error:', err);
    }
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, authMethod, isLoading, error, loginWithWeb, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() harus digunakan di dalam <AuthProvider>.');
  return ctx;
}

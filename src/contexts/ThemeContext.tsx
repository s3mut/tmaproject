import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // 1. Cek localStorage terlebih dahulu (Prioritas Tertinggi)
    const storedTheme = localStorage.getItem('tma_theme') as Theme | null;
    if (storedTheme) {
      return storedTheme;
    }
    
    // 2. Fallback utama: Telegram WebApp colorScheme
    const tgScheme = (window as any).Telegram?.WebApp?.colorScheme;
    if (tgScheme === 'dark' || tgScheme === 'light') {
      return tgScheme;
    }
    
    // 3. Fallback terakhir: Preferensi OS (di luar Telegram)
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  });

  // Terapkan ke DOM
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    // Dihapus: localStorage.setItem('tma_theme', theme) 
    // agar sistem dapat mendeteksi apakah preferensi eksplisit / manual telah di-set.
  }, [theme]);

  // Listener live update tema dari Telegram
  useEffect(() => {
    const handleThemeChange = () => {
      // HANYA update secara live jika user belum pernah override secara manual
      if (!localStorage.getItem('tma_theme')) {
        const tgScheme = (window as any).Telegram?.WebApp?.colorScheme;
        if (tgScheme === 'dark' || tgScheme === 'light') {
          setTheme(tgScheme);
        }
      }
    };

    const WebApp = (window as any).Telegram?.WebApp;
    if (WebApp && typeof WebApp.onEvent === 'function') {
      try {
        WebApp.onEvent('themeChanged', handleThemeChange);
      } catch (err) {
        console.error('Failed to attach themeChanged event:', err);
      }
    }

    return () => {
      if (WebApp && typeof WebApp.offEvent === 'function') {
        try {
          WebApp.offEvent('themeChanged', handleThemeChange);
        } catch (err) {
          console.error('Failed to detach themeChanged event:', err);
        }
      }
    };
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const nextTheme = prev === 'light' ? 'dark' : 'light';
      // Simpan eksplisit ke localStorage HANYA saat user melakukan toggle manual
      localStorage.setItem('tma_theme', nextTheme);
      return nextTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}


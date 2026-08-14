import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const LoginView = () => {
  const { loginWithWeb, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused]       = useState<'id' | 'pass' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedId = identifier.trim();
    if (!trimmedId) { setError('Telegram ID atau Username wajib diisi.'); return; }
    if (!password)  { setError('Password wajib diisi.'); return; }
    setSubmitting(true);
    try {
      await loginWithWeb(trimmedId, password);
    } catch (err: any) {
      setError(err.message || 'Gagal login. Periksa kembali ID/Username dan password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/50 text-slate-900'
    }`}>
      {/* Animated background orbs */}
      <div className={`absolute -top-10 -left-10 w-96 h-96 rounded-full blur-3xl pointer-events-none animate-pulse ${
        isDark ? 'bg-blue-600/10' : 'bg-blue-400/20'
      }`} />
      <div className={`absolute -bottom-10 -right-10 w-96 h-96 rounded-full blur-3xl pointer-events-none animate-pulse ${
        isDark ? 'bg-purple-600/10' : 'bg-indigo-400/20'
      }`} />

      {/* Dot grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, ${isDark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.12)'} 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }}
      />

      {/* Top Right Theme Toggle Button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          className={`px-3 py-2 rounded-xl border flex items-center gap-2 text-xs font-bold shadow-sm transition-all cursor-pointer ${
            isDark
              ? 'bg-slate-900/90 border-slate-700 text-yellow-400 hover:bg-slate-800'
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-slate-200/80'
          }`}
          title={`Beralih ke Tema ${isDark ? 'Terang' : 'Gelap'}`}
        >
          <i className={`fas ${isDark ? 'fa-sun text-yellow-400' : 'fa-moon text-indigo-600'}`} />
          <span>{isDark ? 'Mode Terang' : 'Mode Gelap'}</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-sm relative z-10 space-y-6 my-auto">
        {/* Header & Logo */}
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center mb-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 relative">
              <i className="fas fa-boxes-stacked text-2xl text-white" />
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center border-2 border-white dark:border-slate-950 shadow">
                <i className="fas fa-bolt text-[8px] text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-1">
            E1-<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">TMA</span>
          </h1>
          <p className={`text-xs font-bold tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            IT Asset Inventory Management
          </p>
        </div>

        {/* Main Login Card */}
        <div className={`rounded-3xl p-6 sm:p-7 border backdrop-blur-xl transition-all ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 shadow-2xl shadow-black/50'
            : 'bg-white border-slate-200/90 shadow-xl shadow-slate-300/40'
        }`}>
          <div className="mb-5">
            <h2 className={`text-base font-bold mb-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Masuk ke Akun
            </h2>
            <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Gunakan Telegram Username atau ID beserta password TMA Anda.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs mb-4">
              <i className="fas fa-circle-exclamation text-sm mt-0.5 shrink-0 text-red-500" />
              <span className="leading-relaxed font-semibold">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            {/* Telegram ID / Username */}
            <div>
              <label className={`block text-[11px] font-bold tracking-wider uppercase mb-1.5 ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
                TELEGRAM ID <span className="text-blue-600 dark:text-blue-400">/ @USERNAME</span>
              </label>
              <div className="relative">
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-sm transition-colors ${
                  focused === 'id' ? 'text-blue-600 dark:text-blue-400' : isDark ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  <i className="fab fa-telegram" />
                </div>
                <input
                  id="login-telegram-id"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onFocus={() => setFocused('id')}
                  onBlur={() => setFocused(null)}
                  placeholder="@username atau 12345678"
                  required
                  className={`w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-xl border outline-none transition-all ${
                    isDark
                      ? focused === 'id'
                        ? 'bg-slate-900 border-blue-500 ring-2 ring-blue-500/20 text-slate-100'
                        : 'bg-slate-950/70 border-slate-800 text-slate-100 placeholder:text-slate-500'
                      : focused === 'id'
                        ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 text-slate-900'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                  }`}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className={`block text-[11px] font-bold tracking-wider uppercase mb-1.5 ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
                PASSWORD
              </label>
              <div className="relative">
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-sm transition-colors ${
                  focused === 'pass' ? 'text-blue-600 dark:text-blue-400' : isDark ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  <i className="fas fa-lock" />
                </div>
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('pass')}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  required
                  className={`w-full pl-10 pr-11 py-3 text-xs sm:text-sm rounded-xl border outline-none transition-all ${
                    isDark
                      ? focused === 'pass'
                        ? 'bg-slate-900 border-blue-500 ring-2 ring-blue-500/20 text-slate-100'
                        : 'bg-slate-950/70 border-slate-800 text-slate-100 placeholder:text-slate-500'
                      : focused === 'pass'
                        ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 text-slate-900'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 text-sm transition-colors cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="login-submit"
              disabled={submitting || isLoading}
              className={`w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all ${
                submitting
                  ? 'opacity-70 cursor-not-allowed bg-blue-600'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] shadow-blue-500/25 cursor-pointer'
              }`}
            >
              {submitting ? (
                <><i className="fas fa-spinner fa-spin" /> Memverifikasi...</>
              ) : (
                <><i className="fas fa-arrow-right-to-bracket" /> Masuk</>
              )}
            </button>
          </form>
        </div>

        {/* Info Cards */}
        <div className="space-y-2.5">
          {/* Telegram auto-login */}
          <div className={`p-3.5 rounded-2xl border backdrop-blur-md flex items-center gap-3 transition-all ${
            isDark
              ? 'bg-slate-900/80 border-slate-800'
              : 'bg-white border-slate-200/90 shadow-sm'
          }`}>
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <i className="fab fa-telegram text-base" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                Akses via Telegram
              </p>
              <p className={`text-[11px] leading-relaxed font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Buka lewat Mini App untuk <span className="text-blue-600 dark:text-blue-400 font-bold">login otomatis</span> — tanpa password.
              </p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse shrink-0" />
          </div>

          {/* Security Badge */}
          <div className={`px-3.5 py-2.5 rounded-2xl border backdrop-blur-md flex items-center gap-2.5 transition-all ${
            isDark
              ? 'bg-slate-900/60 border-slate-800 text-slate-300'
              : 'bg-white/80 border-slate-200 text-slate-700 shadow-sm'
          }`}>
            <i className="fas fa-shield-halved text-emerald-600 dark:text-emerald-400 text-xs shrink-0" />
            <p className="text-[11px] font-medium leading-relaxed">
              Koneksi terenkripsi via <span className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Supabase RLS</span> · Data tersimpan aman
            </p>
          </div>

          {/* How to get access */}
          <div className={`p-3.5 rounded-2xl border backdrop-blur-md transition-all ${
            isDark
              ? 'bg-slate-900/80 border-slate-800'
              : 'bg-white border-slate-200/90 shadow-sm'
          }`}>
            <p className={`text-xs font-bold mb-2 flex items-center gap-1.5 ${
              isDark ? 'text-slate-200' : 'text-slate-900'
            }`}>
              <i className="fas fa-circle-question text-amber-500" />
              Belum punya akses?
            </p>
            <ol className={`text-[11px] space-y-1 pl-4 list-decimal leading-relaxed font-medium ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}>
              <li>Buka <strong className={isDark ? 'text-slate-100' : 'text-slate-900'}>Telegram</strong> → cari bot <strong className="text-blue-600 dark:text-blue-400 font-bold">E1-TMA</strong> → Start</li>
              <li>Di tab <strong className={isDark ? 'text-slate-100' : 'text-slate-900'}>Profil</strong>, klik <strong className="text-blue-600 dark:text-blue-400 font-bold">Password Akses Web</strong></li>
              <li>Set password, lalu login di sini dengan <strong className={isDark ? 'text-slate-100' : 'text-slate-900'}>@username</strong></li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <p className={`text-center text-[11px] font-bold ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}>
          © {new Date().getFullYear()} E1-TMA — E1 IT Asset Management
        </p>
      </div>
    </div>
  );
};

export default LoginView;

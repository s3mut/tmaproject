import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginView = () => {
  const { loginWithWeb, isLoading } = useAuth();
  const [telegramId, setTelegramId] = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const id = parseInt(telegramId, 10);
    if (isNaN(id) || id <= 0) {
      setError('Masukkan Telegram ID yang valid (angka).');
      return;
    }
    if (!password) {
      setError('Password wajib diisi.');
      return;
    }
    setSubmitting(true);
    try {
      await loginWithWeb(id, password);
    } catch (err: any) {
      setError(err.message || 'Gagal login. Periksa Telegram ID dan password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="w-full max-w-sm relative">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-blue-500/40">
            <i className="fas fa-boxes-stacked text-3xl text-white"></i>
          </div>
          <h1 className="text-2xl font-bold text-white">TransitTMA</h1>
          <p className="text-sm text-slate-400 mt-1">IT Asset Inventory Management</p>
        </div>

        {/* Login Card */}
        <div className="glass rounded-3xl p-6 shadow-2xl border border-slate-700/50 space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white">Masuk ke Akun</h2>
            <p className="text-xs text-slate-400">Gunakan Telegram ID dan password yang telah diset dari aplikasi.</p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-xs">
              <i className="fas fa-exclamation-circle mt-0.5 shrink-0"></i>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {/* Telegram ID */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">
                Telegram ID <span className="text-blue-400">(Username Anda)</span>
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                  <i className="fab fa-telegram text-blue-400"></i>
                </div>
                <input
                  id="login-telegram-id"
                  type="number"
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value)}
                  placeholder="Contoh: 123456789"
                  required
                  className="form-input w-full pl-9 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-600 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-500 pl-1">
                Cek Telegram ID Anda via <span className="text-blue-400 font-medium">@userinfobot</span> di Telegram.
              </p>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">Password</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                  <i className="fas fa-lock"></i>
                </div>
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="form-input w-full pl-9 pr-10 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-600 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-sm p-1"
                >
                  <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="login-submit"
              disabled={submitting || isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
            >
              {submitting ? (
                <><i className="fas fa-spinner fa-spin"></i> Memverifikasi...</>
              ) : (
                <><i className="fas fa-sign-in-alt"></i> Masuk</>
              )}
            </button>
          </form>
        </div>

        {/* Telegram Auto-Login Info */}
        <div className="mt-4 glass rounded-2xl px-4 py-3.5 flex items-center gap-3 border border-blue-500/20">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
            <i className="fab fa-telegram text-lg"></i>
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Akses via Telegram</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Buka aplikasi melalui Telegram Mini App untuk <span className="text-blue-400">login otomatis</span> — tanpa perlu password.
            </p>
          </div>
          <div className="ml-auto w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0"></div>
        </div>

        <p className="text-center text-[10px] text-slate-600 mt-5">
          © {new Date().getFullYear()} TransitTMA — IT Asset Management
        </p>
      </div>
    </div>
  );
};

export default LoginView;

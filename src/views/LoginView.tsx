import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginView = () => {
  const { loginWithWeb, isLoading } = useAuth();
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #080c18 100%)',
    }}>
      {/* Animated background orbs */}
      <div style={{ position: 'absolute', top: '-5%', left: '-10%', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.14) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'lv-orbFloat 7s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'lv-orbFloat 9s ease-in-out infinite reverse' }} />
      <div style={{ position: 'absolute', top: '40%', right: '5%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 70%)', filter: 'blur(40px)', animation: 'lv-orbFloat 6s ease-in-out infinite 1.5s' }} />
      <div style={{ position: 'absolute', bottom: '20%', left: '5%', width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 70%)', filter: 'blur(30px)', animation: 'lv-orbFloat 8s ease-in-out infinite 3s' }} />

      {/* Dot grid pattern */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.06) 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />

      {/* Card container */}
      <div style={{ width: '100%', maxWidth: 380, position: 'relative', animation: 'lv-fadeSlideUp 0.5s ease-out both' }}>

        {/* Logo & Branding */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)', animation: 'lv-glow 2.5s ease-in-out infinite' }} />
            <div style={{ width: 76, height: 76, borderRadius: 22, background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(59,130,246,0.4), 0 0 0 1px rgba(59,130,246,0.2)', position: 'relative' }}>
              <i className="fas fa-boxes-stacked" style={{ fontSize: 30, color: 'white' }}></i>
              <div style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0a0f1e', boxShadow: '0 2px 8px rgba(16,185,129,0.5)' }}>
                <i className="fas fa-bolt" style={{ fontSize: 8, color: 'white' }}></i>
              </div>
            </div>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', letterSpacing: '-0.5px', margin: '0 0 6px' }}>
            Transit<span style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>TMA</span>
          </h1>
          <p style={{ fontSize: 12, color: '#475569', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>IT Asset Inventory Management</p>
        </div>

        {/* Login Card */}
        <div style={{
          background: 'rgba(15,23,42,0.75)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(148,163,184,0.1)',
          borderRadius: 24,
          padding: '28px 24px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: '0 0 4px' }}>Masuk ke Akun</h2>
            <p style={{ fontSize: 11, color: '#475569', margin: 0, lineHeight: 1.5 }}>Gunakan Telegram Username atau ID beserta password TMA Anda.</p>
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, marginBottom: 16, animation: 'lv-fadeSlideUp 0.3s ease-out' }}>
              <i className="fas fa-circle-exclamation" style={{ color: '#f87171', fontSize: 13, marginTop: 1, flexShrink: 0 }}></i>
              <span style={{ fontSize: 12, color: '#fca5a5', lineHeight: 1.5 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Telegram ID / Username */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, letterSpacing: '0.05em' }}>
                TELEGRAM ID <span style={{ color: '#3b82f6' }}>/ @USERNAME</span>
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused === 'id' ? '#3b82f6' : '#334155', transition: 'color 0.2s', fontSize: 14 }}>
                  <i className="fab fa-telegram"></i>
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
                  style={{
                    width: '100%',
                    paddingLeft: 40,
                    paddingRight: 16,
                    paddingTop: 12,
                    paddingBottom: 12,
                    background: focused === 'id' ? 'rgba(59,130,246,0.07)' : 'rgba(8,12,24,0.6)',
                    border: `1px solid ${focused === 'id' ? 'rgba(59,130,246,0.5)' : 'rgba(100,116,139,0.15)'}`,
                    borderRadius: 12,
                    color: 'white',
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s',
                    boxShadow: focused === 'id' ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, letterSpacing: '0.05em' }}>PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused === 'pass' ? '#3b82f6' : '#334155', transition: 'color 0.2s', fontSize: 13 }}>
                  <i className="fas fa-lock"></i>
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
                  style={{
                    width: '100%',
                    paddingLeft: 40,
                    paddingRight: 44,
                    paddingTop: 12,
                    paddingBottom: 12,
                    background: focused === 'pass' ? 'rgba(59,130,246,0.07)' : 'rgba(8,12,24,0.6)',
                    border: `1px solid ${focused === 'pass' ? 'rgba(59,130,246,0.5)' : 'rgba(100,116,139,0.15)'}`,
                    borderRadius: 12,
                    color: 'white',
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s',
                    boxShadow: focused === 'pass' ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#334155', background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: 13, transition: 'color 0.2s' }}
                >
                  <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="login-submit"
              disabled={submitting || isLoading}
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: 12,
                background: submitting ? 'rgba(59,130,246,0.4)' : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                border: 'none',
                color: 'white',
                fontWeight: 700,
                fontSize: 14,
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: submitting ? 'none' : '0 4px 20px rgba(59,130,246,0.35)',
                transition: 'all 0.2s',
                marginTop: 4,
                letterSpacing: '0.02em',
              }}
            >
              {submitting
                ? <><i className="fas fa-spinner fa-spin" style={{ fontSize: 13 }}></i> Memverifikasi...</>
                : <><i className="fas fa-arrow-right-to-bracket" style={{ fontSize: 13 }}></i> Masuk</>
              }
            </button>
          </form>
        </div>

        {/* Info Cards */}
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Telegram auto-login */}
          <div style={{ background: 'rgba(10,15,30,0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(59,130,246,0.18)' }}>
              <i className="fab fa-telegram" style={{ color: '#3b82f6', fontSize: 16 }}></i>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'white', margin: '0 0 2px' }}>Akses via Telegram</p>
              <p style={{ fontSize: 10, color: '#475569', margin: 0, lineHeight: 1.5 }}>
                Buka lewat Mini App untuk <span style={{ color: '#60a5fa' }}>login otomatis</span> — tanpa password.
              </p>
            </div>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.6)', flexShrink: 0, animation: 'lv-glow 2s ease-in-out infinite' }}></div>
          </div>

          {/* Security badge */}
          <div style={{ background: 'rgba(10,15,30,0.5)', border: '1px solid rgba(148,163,184,0.07)', borderRadius: 16, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-shield-halved" style={{ color: '#10b981', fontSize: 14, flexShrink: 0 }}></i>
            <p style={{ fontSize: 10, color: '#334155', margin: 0, lineHeight: 1.5 }}>
              Koneksi terenkripsi via <span style={{ color: '#475569' }}>Supabase RLS</span> · Data tersimpan aman
            </p>
          </div>

          {/* How to get access */}
          <div style={{ background: 'rgba(10,15,30,0.5)', border: '1px solid rgba(148,163,184,0.07)', borderRadius: 16, padding: '12px 16px' }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#64748b', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fas fa-circle-question" style={{ color: '#f59e0b' }}></i>
              Belum punya akses?
            </p>
            <ol style={{ fontSize: 10, color: '#334155', margin: 0, paddingLeft: 14, lineHeight: 1.9 }}>
              <li>Buka <span style={{ color: '#64748b' }}>Telegram</span> → cari bot <span style={{ color: '#60a5fa' }}>TransitTMA</span> → Start</li>
              <li>Di tab <span style={{ color: '#64748b' }}>Profil</span>, klik <span style={{ color: '#60a5fa' }}>Password Akses Web</span></li>
              <li>Set password, lalu login di sini dengan <span style={{ color: '#64748b' }}>@username</span></li>
            </ol>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 10, color: '#1e293b', marginTop: 20 }}>
          © {new Date().getFullYear()} TransitTMA — E1 IT Asset Management
        </p>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes lv-orbFloat { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-18px) scale(1.04); } }
        @keyframes lv-fadeSlideUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lv-glow { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
};

export default LoginView;

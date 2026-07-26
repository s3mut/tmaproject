import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      const isMissingEnv = this.state.error?.message?.includes('environment variables');
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          padding: '24px',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '420px',
            width: '100%',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ color: '#f8fafc', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>
              {isMissingEnv ? 'Konfigurasi Tidak Lengkap' : 'Terjadi Kesalahan'}
            </h2>
            {isMissingEnv ? (
              <div style={{ textAlign: 'left', marginTop: '16px' }}>
                <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '12px' }}>
                  Variabel environment Supabase belum diatur di Vercel. Tambahkan di:
                </p>
                <div style={{
                  background: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '12px',
                  color: '#60a5fa',
                  fontFamily: 'monospace',
                }}>
                  <div>Vercel → Project Settings</div>
                  <div>→ Environment Variables</div>
                  <div style={{ marginTop: '8px', color: '#94a3b8' }}>VITE_SUPABASE_URL</div>
                  <div style={{ color: '#94a3b8' }}>VITE_SUPABASE_ANON_KEY</div>
                </div>
                <p style={{ color: '#64748b', fontSize: '12px', marginTop: '12px' }}>
                  Setelah ditambahkan, lakukan Redeploy di Vercel Dashboard.
                </p>
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '8px' }}>
                {this.state.error?.message ?? 'Unknown error'}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '20px',
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

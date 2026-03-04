import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [apiKey, setApiKey] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await login(apiKey);
            navigate('/dashboard');
        } catch {
            setError('Invalid API key. Please check and try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-page">
            <div className="login-container animate-fade-in">
                <div className="login-logo">
                    <div className="login-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <h1 className="login-title">DocFingerprint</h1>
                    <p className="login-subtitle">Institution Dashboard</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label className="form-label" htmlFor="apiKey">API Key</label>
                        <div className="input-with-icon">
                            <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                            </svg>
                            <input
                                id="apiKey"
                                type="password"
                                className="input"
                                placeholder="Enter your API key"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                required
                                disabled={loading}
                                autoComplete="off"
                                style={{ paddingLeft: '2.5rem' }}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="alert alert-error">{error}</div>
                    )}

                    <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading || !apiKey}>
                        {loading ? (
                            <>
                                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                Authenticating...
                            </>
                        ) : (
                            'Sign in'
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Need an API key? <a href="#">Contact support</a></p>
                </div>
            </div>

            <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(ellipse at top, #0f172a 0%, #0a0f1a 100%);
        }
        .login-container {
          width: 100%;
          max-width: 420px;
          padding: var(--space-8);
        }
        .login-logo {
          text-align: center;
          margin-bottom: var(--space-8);
        }
        .login-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: var(--radius-xl);
          background: linear-gradient(135deg, var(--color-accent), #6366f1);
          color: white;
          margin-bottom: var(--space-4);
          box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
        }
        .login-title {
          font-size: var(--text-2xl);
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .login-subtitle {
          font-size: var(--text-sm);
          color: var(--color-text-muted);
          margin-top: var(--space-1);
        }
        .login-form {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: var(--space-8);
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }
        .input-with-icon {
          position: relative;
        }
        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-muted);
        }
        .login-footer {
          text-align: center;
          margin-top: var(--space-6);
          font-size: var(--text-sm);
          color: var(--color-text-muted);
        }
      `}</style>
        </div>
    );
}

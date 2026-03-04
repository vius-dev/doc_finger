import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { verifyDocument, type VerificationResult } from '../../services/api';

export default function Verify() {
    const { id } = useParams<{ id: string }>();
    const [fingerprint, setFingerprint] = useState(id ?? '');
    const [result, setResult] = useState<VerificationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-verify if fingerprint is in URL
    useState(() => { if (id) handleVerify(id); });

    async function handleVerify(fpId?: string) {
        const searchId = fpId ?? fingerprint;
        if (!searchId.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const data = await verifyDocument(searchId.trim());
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Verification failed');
        } finally {
            setLoading(false);
        }
    }

    function onSubmit(e: FormEvent) {
        e.preventDefault();
        handleVerify();
    }

    return (
        <div className="verify-page">
            <div className="verify-container animate-fade-in">
                {/* Header */}
                <div className="verify-header">
                    <div className="verify-logo">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h1 className="verify-title">Verify Document</h1>
                    <p className="verify-subtitle">Enter a document fingerprint ID to verify its authenticity</p>
                </div>

                {/* Search */}
                <form onSubmit={onSubmit} className="verify-search">
                    <input
                        className="input"
                        placeholder="e.g. UNILAG-FP-A1B2C3D4"
                        value={fingerprint}
                        onChange={(e) => setFingerprint(e.target.value)}
                        style={{ fontSize: 'var(--text-lg)', padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-mono)' }}
                    />
                    <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !fingerprint.trim()}>
                        {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Verify'}
                    </button>
                </form>

                {error && <div className="alert alert-error mt-6">{error}</div>}

                {/* Result */}
                {result && (
                    <div className="verify-result animate-fade-in mt-6">
                        <div className={`verify-status ${result.verified ? 'verify-status-valid' : 'verify-status-invalid'}`}>
                            {result.verified ? (
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" />
                                    <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : (
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="15" y1="9" x2="9" y2="15" strokeLinecap="round" />
                                    <line x1="9" y1="9" x2="15" y2="15" strokeLinecap="round" />
                                </svg>
                            )}
                            <h2>{result.status_message}</h2>
                        </div>

                        {result.document && (
                            <div className="verify-details">
                                <div className="verify-row">
                                    <span className="verify-label">Document Type</span>
                                    <span className="verify-value">{result.document.type.replace(/_/g, ' ')}</span>
                                </div>
                                <div className="verify-row">
                                    <span className="verify-label">Recipient</span>
                                    <span className="verify-value">{result.document.recipient_name}</span>
                                </div>
                                <div className="verify-row">
                                    <span className="verify-label">Issue Date</span>
                                    <span className="verify-value">{new Date(result.document.issue_date).toLocaleDateString()}</span>
                                </div>
                                <div className="verify-row">
                                    <span className="verify-label">Expiry Date</span>
                                    <span className="verify-value">{result.document.expiry_date ? new Date(result.document.expiry_date).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                {result.issuer && (
                                    <>
                                        <div className="verify-divider" />
                                        <div className="verify-row">
                                            <span className="verify-label">Issued By</span>
                                            <span className="verify-value">{result.issuer.name}</span>
                                        </div>
                                        <div className="verify-row">
                                            <span className="verify-label">Institution Type</span>
                                            <span className="verify-value">{result.issuer.type}</span>
                                        </div>
                                        <div className="verify-row">
                                            <span className="verify-label">Country</span>
                                            <span className="verify-value">{result.issuer.country}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="verify-meta">
                            Checked at {new Date(result.checked_at).toLocaleString()} · {result.response_time_ms}ms
                        </div>
                    </div>
                )}
            </div>

            <style>{`
        .verify-page {
          min-height: 100vh;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: var(--space-12) var(--space-4);
          background: radial-gradient(ellipse at top, #0f172a 0%, #0a0f1a 100%);
        }
        .verify-container { width: 100%; max-width: 560px; }
        .verify-header { text-align: center; margin-bottom: var(--space-8); }
        .verify-logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          border-radius: var(--radius-xl);
          background: linear-gradient(135deg, #10b981, #06b6d4);
          color: white;
          margin-bottom: var(--space-4);
          box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);
        }
        .verify-title { font-size: var(--text-3xl); font-weight: 700; }
        .verify-subtitle { color: var(--color-text-muted); margin-top: var(--space-2); }
        .verify-search {
          display: flex;
          gap: var(--space-3);
        }
        .verify-search .input { flex: 1; }
        .verify-result {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          overflow: hidden;
        }
        .verify-status {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-6);
        }
        .verify-status h2 { font-size: var(--text-xl); font-weight: 600; }
        .verify-status-valid {
          background: rgba(16, 185, 129, 0.08);
          color: var(--color-success);
          border-bottom: 1px solid rgba(16, 185, 129, 0.2);
        }
        .verify-status-invalid {
          background: rgba(239, 68, 68, 0.08);
          color: var(--color-danger);
          border-bottom: 1px solid rgba(239, 68, 68, 0.2);
        }
        .verify-details { padding: var(--space-4) var(--space-6); }
        .verify-row {
          display: flex;
          justify-content: space-between;
          padding: var(--space-2) 0;
        }
        .verify-label { color: var(--color-text-muted); font-size: var(--text-sm); }
        .verify-value { color: var(--color-text-primary); font-weight: 500; font-size: var(--text-sm); }
        .verify-divider { border-top: 1px solid var(--color-border); margin: var(--space-3) 0; }
        .verify-meta {
          padding: var(--space-3) var(--space-6);
          font-size: var(--text-xs);
          color: var(--color-text-muted);
          border-top: 1px solid var(--color-border);
          text-align: center;
        }
      `}</style>
        </div>
    );
}

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
                <div className="verify-search-container no-print">
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
                </div>

                {error && <div className="alert alert-error mt-6 no-print">{error}</div>}

                {/* Result / Certificate */}
                {result && (
                    <div className="animate-fade-in mt-10">
                        <div className="flex justify-between items-center mb-6 no-print">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                {result.verified ? (
                                    <span className="text-[var(--color-success)] flex items-center gap-1">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                        Valid Document
                                    </span>
                                ) : (
                                    <span className="text-[var(--color-danger)] flex items-center gap-1">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                        Verification Failed
                                    </span>
                                )}
                            </h2>
                            <button className="btn btn-secondary flex items-center gap-2" onClick={() => window.print()}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                                Download Certificate
                            </button>
                        </div>

                        <div className="certificate-frame">
                            <div className="certificate-border">
                                <div className="certificate-inner">
                                    {/* Guilloche Pattern Background */}
                                    <div className="certificate-guilloche" />

                                    {/* Header */}
                                    <div className="certificate-header">
                                        <div className="certificate-institution">
                                            <div className="certificate-issuer-logo">
                                                {result.issuer?.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="certificate-issuer-name">{result.issuer?.name}</div>
                                                <div className="certificate-issuer-meta">Official Digital Evidence · {result.issuer?.country}</div>
                                            </div>
                                        </div>
                                        <div className="certificate-seal">
                                            <svg viewBox="0 0 100 100" className="w-24 h-24">
                                                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="2 2" />
                                                <circle cx="50" cy="50" r="38" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
                                                <path id="curve" d="M 20,50 a 30,30 0 1,1 60,0 a 30,30 0 1,1 -60,0" fill="transparent" />
                                                <text className="text-[6px] uppercase tracking-[2px]" fill="var(--color-accent)">
                                                    <textPath href="#curve" startOffset="50%" textAnchor="middle">
                                                        Authentic Evidence · Secured by DocFinger ·
                                                    </textPath>
                                                </text>
                                                {result.verified ? (
                                                    <g transform="translate(35, 35) scale(1.2)">
                                                        <path d="M15 3.5l-4 4-2-2" stroke="var(--color-accent)" strokeWidth="2" fill="none" />
                                                    </g>
                                                ) : (
                                                    <text x="50" y="50" dominantBaseline="middle" textAnchor="middle" fontSize="20" fill="var(--color-danger)">✕</text>
                                                )}
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div className="certificate-body">
                                        <div className="certificate-type-identifier">{result.document?.type.replace(/_/g, ' ')}</div>
                                        <div className="certificate-statement">This document presence is formally verified and cryptographically secured.</div>

                                        <div className="certificate-recipient-name">{result.document?.recipient_name}</div>
                                        <div className="certificate-recipient-label">DOCUMENT RECIPIENT</div>

                                        <div className="certificate-metadata-grid">
                                            <div className="cert-meta-item">
                                                <div className="cert-meta-label">ID Number / Reference</div>
                                                <div className="cert-meta-value font-mono">{id || fingerprint}</div>
                                            </div>
                                            <div className="cert-meta-item">
                                                <div className="cert-meta-label">Issuance Date</div>
                                                <div className="cert-meta-value">{result.document?.issue_date ? new Date(result.document.issue_date).toLocaleDateString(undefined, { dateStyle: 'long' }) : '-'}</div>
                                            </div>
                                            <div className="cert-meta-item">
                                                <div className="cert-meta-label">Expiration Status</div>
                                                <div className="cert-meta-value">
                                                    {result.document?.expiry_date
                                                        ? new Date(result.document.expiry_date).toLocaleDateString(undefined, { dateStyle: 'long' })
                                                        : 'Perpetual'
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer / Evidence */}
                                    <div className="certificate-footer">
                                        <div className="certificate-evidence">
                                            <div className="qr-placeholder flex items-center justify-center border border-[var(--color-accent-subtle)] bg-white p-2 rounded">
                                                {/* In a real app we'd use a QR component here */}
                                                <svg width="60" height="60" viewBox="0 0 24 24" fill="var(--color-accent)"><path d="M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm13-2h3v2h-3zm-3 0h2v2h-2zm3 3h3v3h-3zm-3 0h2v2h-2zm3-3h3v2h-3zm-3 0h2v2h-2z" /></svg>
                                            </div>
                                            <div className="evidence-text">
                                                <div className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-widest">Cryptographic Evidence</div>
                                                <div className="text-[8px] font-mono mt-1 text-[var(--color-text-secondary)] break-all truncate max-w-[200px]">
                                                    {result.fingerprint_id}
                                                </div>
                                                <div className="text-[8px] italic mt-1 text-[var(--color-accent)]">Verified at {new Date(result.checked_at).toLocaleString()}</div>
                                            </div>
                                        </div>
                                        <div className="certificate-signature">
                                            <div className="signature-line" />
                                            <div className="signature-label">Digital Registrar Registry</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-center mt-12 text-sm text-[var(--color-text-muted)] no-print">
                            Evidence generated by DocFinger Registry Engine v2.4 · {result.response_time_ms}ms processing
                        </div>
                    </div>
                )}
            </div>

            <style>{`
            @media print {
                .no-print, nav, .verify-header { display: none !important; }
                body { background: white !important; padding: 0 !important; color: black !important; }
                .verify-page { padding: 0 !important; background: none !important; display: block !important; }
                .certificate-frame { 
                    margin: 0 !important; 
                    box-shadow: none !important; 
                    border: none !important;
                    width: 100% !important;
                    height: 100vh !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }
                .certificate-inner { background: white !important; }
                .certificate-border { border-color: #000 !important; }
            }

            .verify-page {
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: var(--space-12) var(--space-4);
                background: radial-gradient(ellipse at top, #0f172a 0%, #0a0f1a 100%);
            }
            .verify-header { text-align: center; margin-bottom: var(--space-8); max-width: 560px; }
            .verify-logo {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 64px;
                height: 64px;
                border-radius: var(--radius-lg);
                background: linear-gradient(135deg, var(--color-accent), #06b6d4);
                color: white;
                margin-bottom: var(--space-4);
                box-shadow: 0 8px 32px rgba(99, 102, 241, 0.3);
            }
            .verify-title { font-size: 2.5rem; font-weight: 800; tracking: -0.025em; }
            
            .verify-search-container { width: 100%; max-width: 560px; }
            .verify-search { display: flex; gap: var(--space-3); }
            .verify-search .input { 
                flex: 1; 
                background: rgba(255,255,255,0.05); 
                border-color: rgba(255,255,255,0.1);
                color: white;
            }
            .verify-search .input:focus { background: rgba(255,255,255,0.1); }

            /* Certificate Styling */
            .certificate-frame {
                width: 100%;
                max-width: 800px;
                background: #fff;
                color: #1a1a1a;
                padding: var(--space-4);
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                border-radius: var(--radius-sm);
                position: relative;
            }
            .certificate-border {
                border: 2px solid #e2e8f0;
                padding: var(--space-2);
                height: 100%;
            }
            .certificate-inner {
                border: 1px solid #cbd5e1;
                padding: var(--space-10) var(--space-12);
                position: relative;
                overflow: hidden;
                background: ivory;
            }
            .certificate-guilloche {
                position: absolute;
                top: 0; left: 0; right: 0; bottom: 0;
                opacity: 0.03;
                pointer-events: none;
                background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 50 Q 25 0, 50 50 T 100 50' fill='none' stroke='%23000' stroke-width='0.5'/%3E%3C/svg%3E");
                background-size: 50px 50px;
            }
            
            .certificate-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: var(--space-12);
            }
            .certificate-institution { display: flex; gap: var(--space-4); align-items: center; }
            .certificate-issuer-logo {
                width: 48px; height: 48px; 
                background: #1a1a1a; color: white;
                display: flex; align-items: center; justify-content: center;
                font-weight: 900; font-size: 24px; border-radius: 4px;
            }
            .certificate-issuer-name { font-weight: 700; font-size: 1.25rem; text-transform: uppercase; letter-spacing: 0.05em; }
            .certificate-issuer-meta { font-size: 0.75rem; color: #64748b; }

            .certificate-body { text-align: center; margin-bottom: var(--space-12); }
            .certificate-type-identifier {
                font-size: 0.875rem; font-weight: 800; color: var(--color-accent);
                text-transform: uppercase; letter-spacing: 0.25em; margin-bottom: var(--space-4);
            }
            .certificate-statement { font-size: 1rem; color: #475569; font-style: italic; margin-bottom: var(--space-8); }
            .certificate-recipient-name {
                font-size: 2.5rem; font-family: serif; font-weight: 700;
                border-bottom: 2px solid #1a1a1a; display: inline-block;
                padding: 0 var(--space-8); margin-bottom: var(--space-2);
            }
            .certificate-recipient-label { font-size: 0.75rem; font-weight: 700; color: #94a3b8; letter-spacing: 0.1em; }

            .certificate-metadata-grid {
                display: grid; grid-template-columns: repeat(3, 1fr);
                gap: var(--space-8); margin-top: var(--space-12); text-align: left;
            }
            .cert-meta-label { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; margin-bottom: var(--space-1); }
            .cert-meta-value { font-size: 0.875rem; font-weight: 600; color: #1e293b; }

            .certificate-footer {
                display: flex; justify-content: space-between; align-items: flex-end;
                margin-top: var(--space-12); border-top: 1px solid #e2e8f0; pt: var(--space-8);
            }
            .certificate-evidence { display: flex; gap: var(--space-4); align-items: center; }
            .certificate-signature { text-align: center; }
            .signature-line { width: 180px; border-top: 1px solid #1a1a1a; margin-bottom: var(--space-2); }
            .signature-label { font-size: 0.75rem; font-weight: 600; color: #64748b; }
        `}</style>
        </div>
    );
}

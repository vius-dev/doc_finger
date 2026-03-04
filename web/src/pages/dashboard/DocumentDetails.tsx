import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDocument, revokeDocument, type DocumentDetail } from '../../services/api';

export default function DocumentDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [doc, setDoc] = useState<DocumentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [revoking, setRevoking] = useState(false);

    useEffect(() => {
        if (!id) return;
        loadDoc();
    }, [id]);

    async function loadDoc() {
        setLoading(true);
        setError(null);
        try {
            const data = await getDocument(id!);
            setDoc(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load document details');
        } finally {
            setLoading(false);
        }
    }

    async function handleRevoke() {
        if (!doc) return;
        if (!confirm('Are you sure you want to revoke this document? This action is permanent and will instantly invalidate it.')) {
            return;
        }

        setRevoking(true);
        try {
            await revokeDocument(doc.fingerprint_id, 'Admin revocation via dashboard');
            await loadDoc(); // Reload to get updated status
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to revoke document');
        } finally {
            setRevoking(false);
        }
    }

    function getStatusConfig(status: string) {
        const configs: Record<string, { label: string; sub: string; color: string; bg: string; icon: string }> = {
            active: {
                label: 'Verified & Active',
                sub: 'This document is authentic and currently valid.',
                color: 'var(--color-success)',
                bg: 'var(--color-success-bg)',
                icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
            },
            revoked: {
                label: 'Revoked',
                sub: 'This document was manually invalidated.',
                color: 'var(--color-danger)',
                bg: 'var(--color-danger-bg)',
                icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
            },
            expired: {
                label: 'Expired',
                sub: 'The validity period for this document has ended.',
                color: 'var(--color-text-muted)',
                bg: 'rgba(100, 116, 139, 0.1)',
                icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
            },
            expired_grace: {
                label: 'Expired (Grace Period)',
                sub: 'Validity has ended but is currently in grace period.',
                color: 'var(--color-info)',
                bg: 'rgba(6, 182, 212, 0.1)',
                icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
            }
        };
        return configs[status] ?? configs.expired;
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Simple visual feedback could go here if we had a toast system
    };

    if (loading) {
        return (
            <div className="animate-fade-in p-8">
                <button onClick={() => navigate(-1)} className="btn btn-ghost mb-6">
                    ← Back to Documents
                </button>
                <div className="loading-center"><div className="spinner spinner-lg" /></div>
            </div>
        );
    }

    if (error || !doc) {
        return (
            <div className="animate-fade-in p-8">
                <button onClick={() => navigate(-1)} className="btn btn-ghost mb-6">
                    ← Back to Documents
                </button>
                <div className="alert alert-error">{error || 'Document not found'}</div>
            </div>
        );
    }

    const statusConfig = getStatusConfig(doc.status);

    return (
        <div className="animate-fade-in max-w-5xl">
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => navigate(-1)} className="btn btn-ghost">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}>
                        <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Back to Registry
                </button>

                <div className="flex gap-3">
                    <button className="btn btn-secondary" onClick={() => window.print()}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-10 0v5h8v-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Print Details
                    </button>
                </div>
            </div>

            {/* Status Banner */}
            <div className="card mb-8" style={{ background: statusConfig.bg, borderColor: statusConfig.color + '44', padding: 'var(--space-5)' }}>
                <div className="flex items-center gap-4">
                    <div style={{ color: statusConfig.color }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d={statusConfig.icon} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div>
                        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: statusConfig.color, marginBottom: 2 }}>{statusConfig.label}</h2>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{statusConfig.sub}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Identity Area */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="card">
                        <div className="card-header flex justify-between items-center">
                            <h3 className="card-title">Issuance Identity</h3>
                            <span className="badge badge-active" style={{ textTransform: 'capitalize' }}>{doc.document_type.replace(/_/g, ' ')}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 py-4">
                            <div>
                                <label className="form-label mb-1 block">Recipient Full Name</label>
                                <div className="text-xl font-bold text-[var(--color-text-primary)]">{doc.recipient_name}</div>
                            </div>
                            <div>
                                <label className="form-label mb-1 block">Document Number</label>
                                <div className="font-mono text-sm uppercase tracking-tight">{doc.document_number || 'NOT PROVIDED'}</div>
                            </div>
                            <div>
                                <label className="form-label mb-1 block">Issuance Date</label>
                                <div className="flex items-center gap-2">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-text-muted)' }}>
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                    <span>{new Date(doc.issue_date).toLocaleDateString('en-US', { dateStyle: 'long' })}</span>
                                </div>
                            </div>
                            <div>
                                <label className="form-label mb-1 block">Expiration Date</label>
                                <div className="flex items-center gap-2">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-text-muted)' }}>
                                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                    </svg>
                                    <span style={{ color: doc.status === 'expired' ? 'var(--color-danger)' : 'inherit' }}>
                                        {doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString('en-US', { dateStyle: 'long' }) : 'Indefinite'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-[var(--color-border)]">
                            <label className="form-label mb-2 block">System Fingerprint</label>
                            <div className="flex items-center gap-2 bg-[var(--color-bg-input)] p-3 rounded-md border border-[var(--color-border)] group">
                                <code className="flex-1 font-mono text-sm text-[var(--color-accent)]">{doc.fingerprint_id}</code>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => copyToClipboard(doc.fingerprint_id)}
                                    title="Copy Fingerprint"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header"><h3 className="card-title">Cryptographic Evidence</h3></div>
                        <div className="space-y-4 py-2">
                            <div>
                                <label className="form-label mb-2 block">Immutable SHA-256 Content Hash</label>
                                <div className="flex gap-2 items-start bg-[var(--color-bg-input)] p-4 rounded-md border border-[var(--color-border)]">
                                    <code className="flex-1 font-mono text-xs break-all text-[var(--color-text-secondary)] leading-relaxed">
                                        {doc.sha256_hash}
                                    </code>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => copyToClipboard(doc.sha256_hash)}
                                        title="Copy Hash"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                        </svg>
                                    </button>
                                </div>
                                <p className="form-hint mt-2">This hash is the unique identifier used to verify document integrity without storing the actual file content.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info Area */}
                <div className="space-y-8">
                    <div className="card">
                        <div className="card-header"><h3 className="card-title">Audit Metadata</h3></div>
                        <div className="space-y-4 py-2">
                            <div>
                                <label className="form-label">Registration Time</label>
                                <div className="text-sm">{new Date(doc.created_at).toLocaleString()}</div>
                            </div>
                            {doc.grace_period_active && (
                                <div className="p-3 bg-[var(--color-info)] bg-opacity-10 border border-[var(--color-info)] border-opacity-20 rounded">
                                    <label className="form-label" style={{ color: 'var(--color-info)' }}>Grace Period Active</label>
                                    <div className="text-sm font-semibold">Ends: {new Date(doc.grace_period_end!).toLocaleDateString()}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {doc.document_metadata && Object.keys(doc.document_metadata).length > 0 && (
                        <div className="card">
                            <div className="card-header"><h3 className="card-title">Extended Data</h3></div>
                            <div className="grid grid-cols-1 gap-3 py-2">
                                {Object.entries(doc.document_metadata).map(([key, value]) => (
                                    <div key={key} className="bg-[var(--color-bg-elevated)] p-3 rounded border border-[var(--color-border)]">
                                        <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold">{key.replace(/_/g, ' ')}</div>
                                        <div className="text-sm font-medium mt-1">{String(value)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {doc.status === 'active' && (
                        <div className="card" style={{ borderColor: 'var(--color-danger-bg)', background: 'rgba(239, 68, 68, 0.02)' }}>
                            <div className="card-header"><h3 className="card-title" style={{ color: 'var(--color-danger)' }}>Security Management</h3></div>
                            <p className="text-xs text-[var(--color-text-muted)] mb-4">Revoking this document will permanently invalidate its fingerprint across all verification portals.</p>
                            <button
                                className="btn btn-danger w-full"
                                onClick={handleRevoke}
                                disabled={revoking}
                            >
                                {revoking ? 'Processing...' : 'Revoke Document'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


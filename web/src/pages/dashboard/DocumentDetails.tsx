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

    function getStatusBadge(status: string) {
        const badgeClass: Record<string, string> = {
            active: 'badge-active',
            expired: 'badge-expired',
            expired_grace: 'badge-grace',
            revoked: 'badge-revoked',
            deleted: 'badge-expired',
        };
        return <span className={`badge ${badgeClass[status] ?? 'badge-expired'}`}>{status.toUpperCase()}</span>;
    }

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

    return (
        <div className="animate-fade-in max-w-4xl">
            <button onClick={() => navigate(-1)} className="btn btn-ghost mb-6">
                ← Back to Documents
            </button>

            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 className="page-title">{doc.document_type.replace(/_/g, ' ')}</h1>
                    <p className="page-subtitle font-mono text-sm tracking-widest">{doc.fingerprint_id}</p>
                </div>
                <div className="flex items-center gap-4">
                    {getStatusBadge(doc.status)}
                    {doc.status === 'active' && (
                        <button
                            className="btn btn-danger"
                            onClick={handleRevoke}
                            disabled={revoking}
                        >
                            {revoking ? 'Revoking...' : 'Revoke Document'}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                {/* Primary Info Card */}
                <div className="card p-6">
                    <h2 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">Issuance Details</h2>
                    <div className="space-y-4">
                        <div>
                            <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Recipient Name</div>
                            <div className="font-medium">{doc.recipient_name}</div>
                        </div>
                        {doc.document_number && (
                            <div>
                                <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Document Number</div>
                                <div className="font-mono text-sm">{doc.document_number}</div>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Issue Date</div>
                                <div>{new Date(doc.issue_date).toLocaleDateString()}</div>
                            </div>
                            <div>
                                <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Expiry Date</div>
                                <div>{doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : 'Never'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cryptographic / System Info Card */}
                <div className="card p-6">
                    <h2 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">Cryptographic Identity</h2>
                    <div className="space-y-4">
                        <div>
                            <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">SHA-256 Hash</div>
                            <div className="font-mono text-xs break-all bg-[var(--color-surface-hover)] p-2 rounded border border-[var(--color-border)]">
                                {doc.sha256_hash}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Created At</div>
                            <div>{new Date(doc.created_at).toLocaleString()}</div>
                        </div>
                        {doc.grace_period_active && (
                            <div>
                                <div className="text-xs text-[var(--color-warning)] uppercase tracking-wider mb-1">Grace Period Active</div>
                                <div>Ends: {doc.grace_period_end ? new Date(doc.grace_period_end).toLocaleString() : 'N/A'}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Metadata JSON Card */}
                {doc.document_metadata && Object.keys(doc.document_metadata).length > 0 && (
                    <div className="card p-6 md:col-span-2">
                        <h2 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">Custom Metadata</h2>
                        <pre className="text-xs font-mono bg-[var(--color-surface-hover)] p-4 rounded border border-[var(--color-border)] overflow-x-auto">
                            {JSON.stringify(doc.document_metadata, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}

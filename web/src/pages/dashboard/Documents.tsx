import { useState, useEffect } from 'react';
import { getDocuments, type Document } from '../../services/api';

export default function Documents() {
    const [docs, setDocs] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadDocuments();
    }, [statusFilter]);

    async function loadDocuments() {
        setLoading(true);
        setError(null);
        try {
            const data = await getDocuments({ status: statusFilter, limit: 50 });
            setDocs(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load documents');
        } finally {
            setLoading(false);
        }
    }

    const filteredDocs = search
        ? docs.filter(
            (d) =>
                d.recipient_name.toLowerCase().includes(search.toLowerCase()) ||
                d.fingerprint_id.toLowerCase().includes(search.toLowerCase())
        )
        : docs;

    function getStatusBadge(status: string, expiryDate: string) {
        const daysToExpiry = Math.ceil(
            (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (status === 'active' && daysToExpiry <= 30 && daysToExpiry > 0) {
            return <span className="badge badge-warning">Expiring Soon</span>;
        }
        const badgeClass: Record<string, string> = {
            active: 'badge-active',
            expired: 'badge-expired',
            expired_grace: 'badge-grace',
            revoked: 'badge-revoked',
            deleted: 'badge-expired',
        };
        return <span className={`badge ${badgeClass[status] ?? 'badge-expired'}`}>{status}</span>;
    }

    return (
        <div className="animate-fade-in">
            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 className="page-title">Documents</h1>
                    <p className="page-subtitle">Manage and track all your issued documents</p>
                </div>
                <a href="/dashboard/register" className="btn btn-primary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 4v16m8-8H4" strokeLinecap="round" />
                    </svg>
                    New Document
                </a>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-6" style={{ flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 280px' }}>
                    <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        className="input"
                        placeholder="Search by name or fingerprint..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ paddingLeft: '2.5rem' }}
                    />
                </div>
                <select
                    className="select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ width: 'auto', minWidth: 160 }}
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="expired_grace">In Grace Period</option>
                    <option value="revoked">Revoked</option>
                </select>
                <button className="btn btn-secondary" onClick={loadDocuments}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 4v6h6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Table */}
            {loading ? (
                <div className="loading-center"><div className="spinner spinner-lg" /></div>
            ) : error ? (
                <div className="alert alert-error">{error}</div>
            ) : filteredDocs.length === 0 ? (
                <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>No documents found</p>
                    <a href="/dashboard/register" className="btn btn-primary mt-4">Register Your First Document</a>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Document</th>
                                <th>Recipient</th>
                                <th>Issue Date</th>
                                <th>Expiry</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDocs.map((doc) => {
                                const daysToExpiry = doc.expiry_date
                                    ? Math.ceil((new Date(doc.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                                    : null;

                                return (
                                    <tr key={doc.fingerprint_id}>
                                        <td>
                                            <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                                                {doc.document_type.replace(/_/g, ' ')}
                                            </div>
                                            <div style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                                                {doc.fingerprint_id}
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--color-text-primary)' }}>{doc.recipient_name}</td>
                                        <td>{new Date(doc.issue_date).toLocaleDateString()}</td>
                                        <td>
                                            <div>{doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : '—'}</div>
                                            {daysToExpiry !== null && daysToExpiry > 0 && daysToExpiry <= 30 && (
                                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)' }}>
                                                    {daysToExpiry} days left
                                                </div>
                                            )}
                                        </td>
                                        <td>{getStatusBadge(doc.status, doc.expiry_date)}</td>
                                        <td>
                                            <a href={`/dashboard/documents/${doc.fingerprint_id}`} className="btn btn-ghost" style={{ fontSize: 'var(--text-xs)' }}>
                                                View →
                                            </a>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

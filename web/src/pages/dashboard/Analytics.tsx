import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getDocuments, getInstitution, type Document, type Institution } from '../../services/api';

export default function Analytics() {
    const { institution: contextInst, institutionId } = useAuth();
    const [docs, setDocs] = useState<Document[]>([]);
    const [institution, setInstitution] = useState<Institution | null>(contextInst);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [d, inst] = await Promise.all([
                    getDocuments({ limit: 200 }),
                    institutionId ? getInstitution(institutionId) : Promise.resolve(null)
                ]);
                setDocs(Array.isArray(d) ? d : []);
                if (inst) setInstitution(inst);
            } catch (err) {
                console.error('Failed to load analytics data', err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [institutionId]);

    const stats = {
        total: docs.length,
        active: docs.filter((d) => d.status === 'active').length,
        expired: docs.filter((d) => d.status === 'expired' || d.status === 'expired_grace').length,
        revoked: docs.filter((d) => d.status === 'revoked').length,
    };

    const byType: Record<string, number> = {};
    docs.forEach((d) => {
        byType[d.document_type] = (byType[d.document_type] || 0) + 1;
    });

    const expiringSoon = docs
        .filter((d) => {
            if (d.status !== 'active' || !d.expiry_date) return false;
            const days = Math.ceil((new Date(d.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return days > 0 && days <= 30;
        })
        .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

    if (loading) {
        return <div className="loading-center"><div className="spinner spinner-lg" /></div>;
    }

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">Analytics</h1>
                <p className="page-subtitle">Usage statistics for {institution?.legal_name ?? 'your institution'}</p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="stat-card">
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Total Documents</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>{stats.active}</div>
                    <div className="stat-label">Active</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-text-muted)' }}>{stats.expired}</div>
                    <div className="stat-label">Expired</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{stats.revoked}</div>
                    <div className="stat-label">Revoked</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* By type */}
                <div className="card">
                    <div className="card-header"><h3 className="card-title">By Document Type</h3></div>
                    {Object.entries(byType).length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>No data yet</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {Object.entries(byType)
                                .sort(([, a], [, b]) => b - a)
                                .map(([type, count]) => (
                                    <div key={type}>
                                        <div className="flex justify-between" style={{ fontSize: 'var(--text-sm)', marginBottom: 4 }}>
                                            <span style={{ color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                                                {type.replace(/_/g, ' ')}
                                            </span>
                                            <span style={{ fontWeight: 600 }}>{count}</span>
                                        </div>
                                        <div style={{ background: 'var(--color-bg-elevated)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                                            <div
                                                style={{
                                                    background: 'var(--color-accent)',
                                                    height: '100%',
                                                    borderRadius: 4,
                                                    width: `${(count / stats.total) * 100}%`,
                                                    transition: 'width 0.5s ease',
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>

                {/* Expiring soon */}
                <div className="card">
                    <div className="card-header"><h3 className="card-title">Expiring Soon</h3></div>
                    {expiringSoon.length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>No documents expiring in the next 30 days</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                            {expiringSoon.slice(0, 10).map((doc) => {
                                const days = Math.ceil((new Date(doc.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                return (
                                    <div key={doc.fingerprint_id} className="flex justify-between items-center" style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) 0' }}>
                                        <div>
                                            <div style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{doc.recipient_name}</div>
                                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                                {doc.document_type.replace(/_/g, ' ')}
                                            </div>
                                        </div>
                                        <span className="badge badge-warning">{days}d left</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Quota */}
            {institution?.monthly_document_quota && (
                <div className="card mt-6">
                    <div className="card-header"><h3 className="card-title">Monthly Quota</h3></div>
                    <div className="flex justify-between" style={{ fontSize: 'var(--text-sm)', marginBottom: 8 }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                            {institution.current_month_usage} of {institution.monthly_document_quota} documents
                        </span>
                        <span style={{ fontWeight: 600 }}>
                            {Math.round((institution.current_month_usage / institution.monthly_document_quota) * 100)}%
                        </span>
                    </div>
                    <div style={{ background: 'var(--color-bg-elevated)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                        <div
                            style={{
                                background: (institution.current_month_usage / institution.monthly_document_quota) > 0.9
                                    ? 'var(--color-danger)'
                                    : 'var(--color-accent)',
                                height: '100%',
                                borderRadius: 6,
                                width: `${Math.min((institution.current_month_usage / institution.monthly_document_quota) * 100, 100)}%`,
                                transition: 'width 0.5s ease',
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

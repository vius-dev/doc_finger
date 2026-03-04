import { useState, useEffect } from 'react';
import { listApiKeys, revokeApiKey, type ApiKey } from '../../services/api';

export default function Keys() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { loadKeys(); }, []);

    async function loadKeys() {
        setLoading(true);
        try {
            const data = await listApiKeys();
            setKeys(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load keys');
        } finally {
            setLoading(false);
        }
    }

    async function handleRevoke(keyId: string) {
        if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return;
        try {
            await revokeApiKey(keyId);
            loadKeys();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to revoke key');
        }
    }

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">API Keys</h1>
                <p className="page-subtitle">Manage your institution's API keys</p>
            </div>

            {loading ? (
                <div className="loading-center"><div className="spinner spinner-lg" /></div>
            ) : error ? (
                <div className="alert alert-error">{error}</div>
            ) : keys.length === 0 ? (
                <div className="empty-state">
                    <p>No API keys found.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Key</th>
                                <th>Name</th>
                                <th>Environment</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Expires</th>
                                <th>Last Used</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {keys.map((key) => (
                                <tr key={key.key_id}>
                                    <td>
                                        <code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                                            {key.key_preview}
                                        </code>
                                    </td>
                                    <td style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                                        {key.name || '—'}
                                    </td>
                                    <td>
                                        <span className={`badge ${key.environment === 'production' ? 'badge-active' : 'badge-warning'}`}>
                                            {key.environment}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${key.status === 'active' ? 'badge-active' : 'badge-revoked'}`}>
                                            {key.status}
                                        </span>
                                    </td>
                                    <td>{new Date(key.created_at).toLocaleDateString()}</td>
                                    <td>{new Date(key.expires_at).toLocaleDateString()}</td>
                                    <td>{key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}</td>
                                    <td>
                                        {key.status === 'active' && (
                                            <button
                                                className="btn btn-ghost"
                                                style={{ color: 'var(--color-danger)', fontSize: 'var(--text-xs)' }}
                                                onClick={() => handleRevoke(key.key_id)}
                                            >
                                                Revoke
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

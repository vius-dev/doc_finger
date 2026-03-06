import React, { useState, useEffect } from 'react'
import {
    Plus,
    Key,
    ShieldCheck,
    Trash2,
    Copy,
    AlertCircle,
    Clock,
    Activity,
    Loader2,
    X,
    Search,
    Filter,
    Check
} from 'lucide-react'
import { adminService, ApiKey, Institution } from '../api/adminService'
import './KeyManagement.css'

const KeyManagement: React.FC = () => {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newKeyData, setNewKeyData] = useState<{
        institutionId: string;
        name: string;
        environment: 'test' | 'production';
        packageStr?: string;
        secret?: string;
    } | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterEnv, setFilterEnv] = useState<'all' | 'test' | 'production'>('all');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [fetchedKeys, fetchedInstitutions] = await Promise.all([
                adminService.fetchAllKeys(),
                adminService.fetchInstitutions()
            ]);
            setKeys(fetchedKeys);
            setInstitutions(fetchedInstitutions);
        } catch (error) {
            console.error('Failed to load keys:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRevoke = async (id: string, keyId: string) => {
        if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) return;

        try {
            await adminService.revokeKey(keyId);
            setKeys(keys.map(k => k.id === id ? { ...k, status: 'revoked' as const } : k));
        } catch (error) {
            alert('Failed to revoke key');
            console.error(error);
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKeyData?.institutionId || !newKeyData?.name) return;

        try {
            let expiresInDays: number | undefined = undefined;
            let usageLimit: number | null = null;

            if (newKeyData.packageStr === 'free_test') {
                expiresInDays = 30;
                usageLimit = 10;
            } else if (newKeyData.packageStr === '1_month') {
                expiresInDays = 30;
            } else if (newKeyData.packageStr === '3_months') {
                expiresInDays = 90;
            } else if (newKeyData.packageStr === '1_year') {
                expiresInDays = 365;
            }

            const result = await adminService.generateKey(
                newKeyData.institutionId,
                newKeyData.name,
                newKeyData.environment,
                expiresInDays,
                usageLimit
            );

            setNewKeyData({ ...newKeyData, secret: result.api_key });
            loadData(); // Refresh list
        } catch (error) {
            const msg = error instanceof Error ? error.message : JSON.stringify(error);
            alert(`Failed to generate key: ${msg}`);
            console.error('Detailed Error: ', error);
        }
    };

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    if (isLoading) {
        return (
            <div className="loading-state">
                <Loader2 className="animate-spin" size={40} />
                <p>Loading security credentials...</p>
            </div>
        );
    }

    const filteredKeys = keys.filter(key => {
        const matchesSearch =
            key.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (key.institutions?.legal_name || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesEnv = filterEnv === 'all' || key.environment === filterEnv;

        return matchesSearch && matchesEnv;
    });

    return (
        <div className="keys-page">
            <div className="page-header">
                <div className="header-text">
                    <h1>Admin API Keys</h1>
                    <p className="subtitle">Manage high-level credentials with root system access.</p>
                </div>
                <button className="btn-primary" onClick={() => {
                    setNewKeyData({ institutionId: '', name: '', environment: 'test', packageStr: '1_year' });
                    setIsModalOpen(true)
                }}>
                    <Plus size={20} />
                    <span>Generate New Key</span>
                </button>
            </div>

            <div className="list-controls">
                <div className="search-bar">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search keys or institutions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                <div className="filter-dropdown">
                    <Filter size={18} className="filter-icon" />
                    <select
                        value={filterEnv}
                        onChange={(e) => setFilterEnv(e.target.value as any)}
                        className="filter-select"
                    >
                        <option value="all">All Environments</option>
                        <option value="test">Test</option>
                        <option value="production">Production</option>
                    </select>
                </div>
            </div>

            {/* Modal for Generation */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass-panel card">
                        <div className="modal-header">
                            <h2>{newKeyData?.secret ? 'Key Generated Successfully' : 'Generate API Key'}</h2>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        {!newKeyData?.secret ? (
                            <form onSubmit={handleGenerate} className="gen-form">
                                <div className="form-group">
                                    <label>Assign to Institution</label>
                                    <select
                                        value={newKeyData?.institutionId}
                                        onChange={e => setNewKeyData({ ...newKeyData!, institutionId: e.target.value })}
                                        required
                                    >
                                        <option value="">Select an organisation...</option>
                                        {institutions.map(inst => (
                                            <option key={inst.id} value={inst.id}>{inst.legal_name} ({inst.institution_code})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Key Name / Label</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Production Main Key"
                                        value={newKeyData?.name}
                                        onChange={e => setNewKeyData({ ...newKeyData!, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Subscription Package</label>
                                    <select
                                        value={newKeyData?.packageStr || '1_year'}
                                        onChange={e => setNewKeyData({ ...newKeyData!, packageStr: e.target.value })}
                                        required
                                    >
                                        <option value="free_test">Free Test (1M / 10 Docs)</option>
                                        <option value="1_month">1 Month (Unlimited)</option>
                                        <option value="3_months">3 Months (Unlimited)</option>
                                        <option value="1_year">1 Year (Unlimited)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Environment</label>
                                    <div className="radio-group">
                                        <label className="radio-item">
                                            <input
                                                type="radio"
                                                name="env"
                                                value="test"
                                                checked={newKeyData?.environment === 'test'}
                                                onChange={() => setNewKeyData({ ...newKeyData!, environment: 'test' as const })}
                                            />
                                            <span>Test</span>
                                        </label>
                                        <label className="radio-item">
                                            <input
                                                type="radio"
                                                name="env"
                                                value="production"
                                                checked={newKeyData?.environment === 'production'}
                                                onChange={() => setNewKeyData({ ...newKeyData!, environment: 'production' as const })}
                                            />
                                            <span>Production</span>
                                        </label>
                                    </div>
                                </div>
                                <button type="submit" className="btn-primary wide">Generate Key</button>
                            </form>
                        ) : (
                            <div className="success-view">
                                <p className="warning-text-box">
                                    <AlertCircle size={16} />
                                    This key will only be shown once. Copy it now.
                                </p>
                                <div className="key-reveal-box">
                                    <code>{newKeyData.secret}</code>
                                    <button
                                        className="icon-btn"
                                        onClick={() => copyToClipboard(newKeyData.secret!, 'new-generated-key')}
                                    >
                                        {copiedId === 'new-generated-key' ? <Check size={20} className="text-success" /> : <Copy size={20} />}
                                    </button>
                                </div>
                                <button className="btn-secondary wide" onClick={() => setIsModalOpen(false)}>I have saved the key</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="warning-banner">
                <AlertCircle size={20} />
                <div className="warning-text">
                    <strong>Security Protocol:</strong> These keys provide administrative access to the system.
                    Generated keys are stored using PBKDF2 hashing with 600k iterations.
                </div>
            </div>

            <div className="keys-grid">
                {filteredKeys.length > 0 ? (
                    filteredKeys.map((key) => (
                        <div key={key.id} className={`key-card card ${key.status}`}>
                            <div className="key-card-header">
                                <div className="key-title">
                                    <div className="key-type-icon">
                                        {key.environment === 'production' ? <ShieldCheck size={20} className="prod-icon" /> : <Key size={20} />}
                                    </div>
                                    <div className="title-stack">
                                        <h3>{key.name}</h3>
                                        <span className="inst-label">{key.institutions?.legal_name || 'System Admin'}</span>
                                    </div>
                                </div>
                                <div className={`status-tag ${key.status}`}>{key.status}</div>
                            </div>

                            <div className="key-body">
                                <div className="key-data-row">
                                    <span className="key-data-label">API Key</span>
                                    <div className="key-display">
                                        <code className="key-string">
                                            {key.key_preview}
                                        </code>
                                        <div className="key-actions">
                                            <button
                                                className="icon-btn"
                                                title="Copy Preview"
                                                onClick={() => copyToClipboard(key.key_preview, key.id)}
                                            >
                                                {copiedId === key.id ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="key-data-row">
                                    <span className="key-data-label">Environment</span>
                                    <span className={`env-tag ${key.environment}`}>{key.environment}</span>
                                </div>

                                <div className="key-footer-data">
                                    <div className="footer-item">
                                        <Clock size={14} />
                                        <span>Expires {new Date(key.expires_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="footer-item">
                                        <Activity size={14} />
                                        <span>
                                            Usage: {key.usage_count}
                                            {key.usage_limit ? ` / ${key.usage_limit}` : ''}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="key-card-actions">
                                {key.status === 'active' && (
                                    <button className="revoke-btn" onClick={() => handleRevoke(key.id, key.key_id)}>
                                        <Trash2 size={16} />
                                        <span>Revoke Key</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state">
                        <Key size={48} className="empty-icon" />
                        <h3>No API keys found</h3>
                        <p>Adjust your search/filters or generate a new key.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default KeyManagement

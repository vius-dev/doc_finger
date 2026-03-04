import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateInstitution, type Institution } from '../../services/api';

type Tab = 'profile' | 'communications' | 'registry' | 'billing';

export default function Settings() {
    const { institution, refreshInstitution } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const [formData, setFormData] = useState<Partial<Institution>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (institution) {
            setFormData({
                legal_name: institution.legal_name,
                trading_name: institution.trading_name || '',
                registration_number: institution.registration_number || '',
                primary_email: institution.primary_email,
                technical_email: institution.technical_email || '',
                billing_email: institution.billing_email || '',
                phone_number: institution.phone_number || '',
                website: institution.website || '',
                physical_address: institution.physical_address || '',
                postal_address: institution.postal_address || '',
                allowed_document_types: institution.allowed_document_types || [],
            });
        }
    }, [institution]);

    if (!institution) {
        return <div className="loading-center"><div className="spinner spinner-lg" /></div>;
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setSuccess(false);
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        setSuccess(false);

        try {
            await updateInstitution(institution.id, formData);
            await refreshInstitution();
            setSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update settings');
        } finally {
            setIsSaving(false);
        }
    };

    const renderTabButton = (id: Tab, label: string) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`tab-btn ${activeTab === id ? 'active' : ''}`}
        >
            {label}
        </button>
    );

    return (
        <div className="animate-fade-in max-w-4xl">
            <div className="page-header">
                <h1 className="page-title">Settings</h1>
                <p className="page-subtitle">Manage your institution profile and registry preferences</p>
            </div>

            {success && (
                <div className="alert alert-success mb-6 flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Settings updated successfully
                </div>
            )}

            {error && (
                <div className="alert alert-error mb-6">{error}</div>
            )}

            <div className="tabs-container mb-8">
                {renderTabButton('profile', 'Institution Profile')}
                {renderTabButton('communications', 'Communications')}
                {renderTabButton('registry', 'Registry Config')}
                {renderTabButton('billing', 'Billing & Usage')}
            </div>

            <form onSubmit={handleSubmit}>
                {activeTab === 'profile' && (
                    <div className="space-y-6">
                        <div className="card">
                            <h3 className="card-title mb-6">Identity Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="form-group">
                                    <label className="form-label">Legal Entity Name</label>
                                    <input name="legal_name" className="input" value={formData.legal_name || ''} onChange={handleChange} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Trading / Public Name</label>
                                    <input name="trading_name" className="input" value={formData.trading_name || ''} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Institution Code (Immutable)</label>
                                    <input className="input" value={institution.institution_code} disabled style={{ background: 'var(--color-bg-primary)', opacity: 0.7 }} />
                                    <p className="form-hint">Used as a prefix for all generated fingerprint IDs.</p>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Registration Number</label>
                                    <input name="registration_number" className="input" value={formData.registration_number || ''} onChange={handleChange} placeholder="e.g. University Charter # / Reg ID" />
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="card-title mb-6">Physical Presence</h3>
                            <div className="grid grid-cols-1 gap-6">
                                <div className="form-group">
                                    <label className="form-label">Physical Address</label>
                                    <textarea name="physical_address" className="textarea" value={formData.physical_address || ''} onChange={handleChange} rows={3} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Postal / Billing Address</label>
                                    <textarea name="postal_address" className="textarea" value={formData.postal_address || ''} onChange={handleChange} rows={3} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'communications' && (
                    <div className="space-y-6">
                        <div className="card">
                            <h3 className="card-title mb-6">Email Channels</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="form-group">
                                    <label className="form-label">Primary Administrative</label>
                                    <input name="primary_email" type="email" className="input" value={formData.primary_email || ''} onChange={handleChange} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Technical Support</label>
                                    <input name="technical_email" type="email" className="input" value={formData.technical_email || ''} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Billing / Accounts</label>
                                    <input name="billing_email" type="email" className="input" value={formData.billing_email || ''} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="card-title mb-6">Public Connectivity</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="form-group">
                                    <label className="form-label">Official Website</label>
                                    <input name="website" type="url" className="input" value={formData.website || ''} onChange={handleChange} placeholder="https://" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Contact Phone</label>
                                    <input name="phone_number" className="input" value={formData.phone_number || ''} onChange={handleChange} placeholder="+1..." />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'registry' && (
                    <div className="space-y-6">
                        <div className="card">
                            <h3 className="card-title mb-6">Registry Guardrails</h3>
                            <div className="form-group">
                                <label className="form-label">Standardized Document Types</label>
                                <div className="mt-4 p-4 bg-[var(--color-bg-primary)] rounded-md border border-[var(--color-border)]">
                                    <div className="flex flex-wrap gap-2">
                                        {(formData.allowed_document_types || []).map(type => (
                                            <span key={type} className="badge badge-active">{type}</span>
                                        ))}
                                        {(!formData.allowed_document_types || formData.allowed_document_types.length === 0) && (
                                            <span className="text-sm text-[var(--color-text-muted)] italic">Global defaults active</span>
                                        )}
                                    </div>
                                    <p className="form-hint mt-4">Contact your technical account manager to enable or restrict specific registration schemas.</p>
                                </div>
                            </div>
                        </div>

                        <div className="card border-dashed border-[var(--color-border)] opacity-60">
                            <h3 className="card-title mb-4">Branding & White-labeling</h3>
                            <p className="text-sm text-[var(--color-text-muted)]">Customize the look of your public verification portal and automated emails. This feature is currently in limited beta.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'billing' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="stat-card">
                                <div className="stat-label">Current Plan</div>
                                <div className="stat-value uppercase mt-1" style={{ color: 'var(--color-accent)' }}>{institution.billing_plan}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-label">Monthly Usage</div>
                                <div className="stat-value mt-1">{institution.current_month_usage}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-label">Monthly Quota</div>
                                <div className="stat-value mt-1">{institution.monthly_document_quota || 'Unlimited'}</div>
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="card-title mb-4">Compliance & Verification</h3>
                            <div className="flex items-center gap-6 p-4 bg-[var(--color-accent-subtle)] rounded-lg border border-[var(--color-border-accent)]">
                                <div className="text-4xl font-bold text-[var(--color-accent)]">{institution.verification_level}</div>
                                <div>
                                    <div className="font-semibold text-[var(--color-text-primary)]">KYB Verification Level</div>
                                    <p className="text-sm text-[var(--color-text-secondary)]">Your institution is verified at Level {institution.verification_level} out of 4.</p>
                                </div>
                                <div className="flex-1 text-right">
                                    <span className="badge badge-active">{institution.status}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab !== 'billing' && (
                    <div className="mt-10 pt-6 border-t border-[var(--color-border)] flex justify-end gap-4">
                        <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('profile')}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                                    Saving...
                                </>
                            ) : 'Save Changes'}
                        </button>
                    </div>
                )}
            </form>

            <style>{`
                .tabs-container {
                    display: flex;
                    border-bottom: 1px solid var(--color-border);
                    gap: var(--space-2);
                }
                .tab-btn {
                    padding: var(--space-3) var(--space-5);
                    background: transparent;
                    border: none;
                    border-bottom: 2px solid transparent;
                    color: var(--color-text-secondary);
                    font-weight: 500;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    font-size: var(--text-sm);
                }
                .tab-btn:hover {
                    color: var(--color-text-primary);
                    background: var(--color-bg-hover);
                }
                .tab-btn.active {
                    color: var(--color-accent);
                    border-bottom-color: var(--color-accent);
                }
                .space-y-6 > * + * {
                    margin-top: var(--space-6);
                }
            `}</style>
        </div>
    );
}

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerDocument } from '../../services/api';

const DOCUMENT_TYPES = [
    { value: 'degree_certificate', label: 'Degree Certificate' },
    { value: 'transcript', label: 'Transcript' },
    { value: 'professional_license', label: 'Professional License' },
    { value: 'employment_contract', label: 'Employment Contract' },
    { value: 'land_title', label: 'Land Title' },
    { value: 'temporary_permit', label: 'Temporary Permit' },
];

export default function Register() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<{
        fingerprint_id: string;
        verification_url: string;
        expiry_date: string;
    } | null>(null);

    const [form, setForm] = useState({
        recipient_name: '',
        document_type: '',
        document_number: '',
        issue_date: new Date().toISOString().split('T')[0],
        expiry_date: '',
    });

    function updateField(field: string, value: string) {
        setForm((f) => ({ ...f, [field]: value }));
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const result = await registerDocument({
                recipient_name: form.recipient_name,
                document_type: form.document_type,
                issue_date: form.issue_date,
                document_number: form.document_number || undefined,
                expiry_date: form.expiry_date || undefined,
            });
            setSuccess(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="animate-fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" style={{ margin: '0 auto' }}>
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" />
                            <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h2 className="page-title">Document Registered</h2>
                    <p className="page-subtitle mt-2">Your document has been successfully registered</p>

                    <div className="card mt-6" style={{ background: 'var(--color-bg-elevated)', textAlign: 'left' }}>
                        <div className="form-group">
                            <span className="form-label">Fingerprint ID</span>
                            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', color: 'var(--color-accent)' }}>
                                {success.fingerprint_id}
                            </code>
                        </div>
                        <div className="form-group mt-4">
                            <span className="form-label">Verification URL</span>
                            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', wordBreak: 'break-all' }}>
                                {success.verification_url}
                            </code>
                        </div>
                        <div className="form-group mt-4">
                            <span className="form-label">Expires</span>
                            <span>{new Date(success.expiry_date).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-center mt-6">
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigator.clipboard.writeText(success.fingerprint_id)}
                        >
                            Copy Fingerprint
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={() => { setSuccess(null); setForm({ recipient_name: '', document_type: '', document_number: '', issue_date: new Date().toISOString().split('T')[0], expiry_date: '' }); }}
                        >
                            Register Another
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: 700, margin: '0 auto' }}>
            <div className="page-header">
                <h1 className="page-title">Register New Document</h1>
                <p className="page-subtitle">Issue a new verified document with a unique fingerprint</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="card mb-6">
                    <div className="card-header"><h3 className="card-title">Document Details</h3></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Recipient Name *</label>
                            <input className="input" required value={form.recipient_name} onChange={(e) => updateField('recipient_name', e.target.value)} placeholder="Full name of the document recipient" />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Document Type *</label>
                            <select className="select" required value={form.document_type} onChange={(e) => updateField('document_type', e.target.value)}>
                                <option value="">Select type</option>
                                {DOCUMENT_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Document Number</label>
                            <input className="input" value={form.document_number} onChange={(e) => updateField('document_number', e.target.value)} placeholder="e.g. CERT-2026-001" />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Issue Date *</label>
                            <input className="input" type="date" required value={form.issue_date} onChange={(e) => updateField('issue_date', e.target.value)} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Expiry Date</label>
                            <input className="input" type="date" value={form.expiry_date} onChange={(e) => updateField('expiry_date', e.target.value)} />
                            <span className="form-hint">Leave blank for type-based default (3 months for temporary)</span>
                        </div>
                    </div>

                    {form.document_type === 'temporary_permit' && !form.expiry_date && (
                        <div className="alert alert-warning mt-4">
                            Temporary permits auto-expire after 3 months from the issue date.
                        </div>
                    )}
                </div>

                {error && <div className="alert alert-error mb-6">{error}</div>}

                <div className="flex gap-3 justify-between" style={{ justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? (
                            <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Registering...</>
                        ) : 'Register Document'}
                    </button>
                </div>
            </form>
        </div>
    );
}

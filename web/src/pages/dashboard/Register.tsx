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

const ID_TYPES = [
    { value: 'national_id', label: 'National ID' },
    { value: 'passport', label: 'Passport' },
    { value: 'license_number', label: 'License Number' },
    { value: 'student_id', label: 'Student ID' },
    { value: 'employee_id', label: 'Employee ID' },
    { value: 'other', label: 'Other' },
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

    const [isAutoNumber, setIsAutoNumber] = useState(true);
    const [isAutoDates, setIsAutoDates] = useState(true);

    const [form, setForm] = useState({
        recipient_name: '',
        recipient_email: '',
        recipient_phone: '',
        recipient_id_type: 'national_id',
        recipient_id_value: '',
        document_type: '',
        document_number: '',
        issue_date: new Date().toISOString().split('T')[0],
        expiry_date: '',
    });

    const updateField = (field: string, value: string) => {
        setForm((f) => ({ ...f, [field]: value }));
        setError(null);
    };

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const result = await registerDocument({
                recipient_name: form.recipient_name,
                document_type: form.document_type,
                issue_date: isAutoDates ? undefined : form.issue_date,
                document_number: isAutoNumber ? undefined : (form.document_number || undefined),
                expiry_date: isAutoDates ? undefined : (form.expiry_date || undefined),
                recipient_email: form.recipient_email || undefined,
                recipient_phone: form.recipient_phone || undefined,
                recipient_id_type: form.recipient_id_type || undefined,
                recipient_id_value: form.recipient_id_value || undefined,
            });
            setSuccess(result);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="animate-fade-in max-w-2xl mx-auto">
                <div className="card text-center py-10">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-full bg-[var(--color-success-subtle)] flex items-center justify-center">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Document Registered</h2>
                    <p className="text-[var(--color-text-secondary)] mb-8">Verification evidence has been generated and distributed.</p>

                    <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl p-6 text-left mb-8">
                        <div className="mb-4">
                            <label className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-muted)]">Fingerprint ID</label>
                            <div className="text-lg font-mono text-[var(--color-accent)] mt-1">{success.fingerprint_id}</div>
                        </div>
                        <div className="mb-4">
                            <label className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-muted)]">Verification URL</label>
                            <div className="text-sm font-mono text-[var(--color-text-secondary)] mt-1 break-all">{success.verification_url}</div>
                        </div>
                        <div>
                            <label className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-muted)]">Lifecycle Expiry</label>
                            <div className="text-sm mt-1">{new Date(success.expiry_date).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
                        </div>
                    </div>

                    <div className="flex gap-4 justify-center">
                        <button className="btn btn-secondary px-8" onClick={() => navigator.clipboard.writeText(success.fingerprint_id)}>Copy ID</button>
                        <button className="btn btn-primary px-8" onClick={() => { setSuccess(null); setForm({ ...form, recipient_name: '', recipient_id_value: '', document_number: '' }); }}>Register Another</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="page-header mb-8">
                <h1 className="page-title">Issue Verification</h1>
                <p className="page-subtitle">Generate high-trust cryptographic evidence for a new document</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Recipient Identity */}
                    <div className="space-y-6">
                        <div className="card h-full">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded bg-[var(--color-accent-subtle)] flex items-center justify-center text-[var(--color-accent)]">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                </div>
                                <h3 className="card-title">Recipient Identity</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="form-group">
                                    <label className="form-label">Legal Name *</label>
                                    <input className="input" required value={form.recipient_name} onChange={(e) => updateField('recipient_name', e.target.value)} placeholder="Recipient's full legal name" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="form-label">ID Type</label>
                                        <select className="select" value={form.recipient_id_type} onChange={(e) => updateField('recipient_id_type', e.target.value)}>
                                            {ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">ID Number</label>
                                        <input className="input" value={form.recipient_id_value} onChange={(e) => updateField('recipient_id_value', e.target.value)} placeholder="Optional" />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Contact Email</label>
                                    <input type="email" className="input" value={form.recipient_email} onChange={(e) => updateField('recipient_email', e.target.value)} placeholder="For automated verification receipts" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Document Logic */}
                    <div className="space-y-6">
                        <div className="card h-full">
                            <div className="flex items-center justify-between gap-3 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-[var(--color-accent-subtle)] flex items-center justify-center text-[var(--color-accent)]">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></svg>
                                    </div>
                                    <h3 className="card-title">Document Logic</h3>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                                    Automation
                                    <input type="checkbox" checked={isAutoNumber && isAutoDates} onChange={(e) => { setIsAutoNumber(e.target.checked); setIsAutoDates(e.target.checked); }} className="accent-[var(--color-accent)]" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="form-group">
                                    <label className="form-label">Document Classification *</label>
                                    <select className="select" required value={form.document_type} onChange={(e) => updateField('document_type', e.target.value)}>
                                        <option value="">Select classification</option>
                                        {DOCUMENT_TYPES.map((t) => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label flex justify-between">
                                        Official ID / Reference
                                        <span className="text-[10px] uppercase text-[var(--color-accent)] cursor-pointer" onClick={() => setIsAutoNumber(!isAutoNumber)}>
                                            {isAutoNumber ? 'Manual Entry' : 'Auto-Generate'}
                                        </span>
                                    </label>
                                    <input className="input" disabled={isAutoNumber} value={isAutoNumber ? 'SYSTEM-GENERATED' : form.document_number} onChange={(e) => updateField('document_number', e.target.value)} placeholder="e.g. CERT-2026-001" style={isAutoNumber ? { background: 'var(--color-bg-primary)', fontStyle: 'italic', opacity: 0.6 } : {}} />
                                    {isAutoNumber && <p className="form-hint">A unique sequence will be allocated by the registry.</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="form-label">Issuance Date</label>
                                        <input className="input" type="date" disabled={isAutoDates} value={form.issue_date} onChange={(e) => updateField('issue_date', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Expiry Date</label>
                                        <input className="input" type="date" disabled={isAutoDates} value={isAutoDates ? '' : form.expiry_date} onChange={(e) => updateField('expiry_date', e.target.value)} placeholder={isAutoDates ? 'Auto-Calculated' : ''} />
                                    </div>
                                </div>
                                {isAutoDates && (
                                    <div className="p-3 bg-[var(--color-bg-elevated)] rounded border border-[var(--color-border)] flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                                        Lifecycle rules will apply based on classification.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <div className="flex gap-4 justify-end pt-6 border-t border-[var(--color-border)]">
                    <button type="button" className="btn btn-secondary px-8" onClick={() => navigate('/dashboard')}>Cancel</button>
                    <button type="submit" className="btn btn-primary px-10" disabled={loading}>
                        {loading ? 'Processing...' : 'Generate Evidence'}
                    </button>
                </div>
            </form>
        </div>
    );
}

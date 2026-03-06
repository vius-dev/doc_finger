import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../../services/api';

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
    const [templates, setTemplates] = useState<api.DocumentTemplate[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<{
        fingerprint_id: string;
        verification_url: string;
        expiry_date: string;
    } | null>(null);



    const [form, setForm] = useState({
        recipient_name: '',
        recipient_email: '',
        recipient_phone: '',
        recipient_id_type: 'national_id',
        recipient_id_value: '',
        height: '',
        gender: '',
        state: '',
        document_type: '',
        document_number: '',
        expiry_date: '',
        template_id: '',
    });

    useEffect(() => {
        loadTemplates();
    }, []);

    async function loadTemplates() {
        try {
            const data = await api.getTemplates();
            setTemplates(data);
        } catch (err) {
            console.error('Failed to load templates', err);
        }
    }

    const handleTemplateChange = (templateId: string) => {
        const template = templates.find(t => t.id === templateId) || null;
        setForm(f => ({
            ...f,
            template_id: templateId,
            document_type: template?.document_type || f.document_type,
            // If template has nomenclature or lifecycle defaults, we could apply them here
        }));
    };

    const updateField = (field: string, value: string) => {
        setForm((f) => ({ ...f, [field]: value }));
        setError(null);
    };

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const metadata: Record<string, string> = {};
            if (form.height) metadata.height = form.height;
            if (form.gender) metadata.gender = form.gender;
            if (form.state) metadata.state = form.state;

            const payload = {
                recipient_name: form.recipient_name,
                document_type: form.document_type,
                issue_date: new Date().toISOString().split('T')[0],
                document_number: undefined,
                expiry_date: undefined,
                recipient_email: form.recipient_email || undefined,
                recipient_phone: form.recipient_phone || undefined,
                recipient_id_type: form.recipient_id_type || undefined,
                recipient_id_value: form.recipient_id_value || undefined,
                template_id: form.template_id || undefined,
                metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
            };
            console.log("PAYLOAD BEING SENT:", payload);

            const result = await api.registerDocument(payload);
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

                                <div className="border-t border-[var(--color-border)] pt-4 mt-2">
                                    <h4 className="text-sm font-semibold mb-3">Anti-Fraud / Physical Traits</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div className="form-group">
                                            <label className="form-label">Height</label>
                                            <input className="input" value={form.height} onChange={(e) => updateField('height', e.target.value)} placeholder="e.g. 5'10 / 178cm" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Gender</label>
                                            <select className="select" value={form.gender} onChange={(e) => updateField('gender', e.target.value)}>
                                                <option value="">Select...</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">State / Region</label>
                                            <input className="input" value={form.state} onChange={(e) => updateField('state', e.target.value)} placeholder="Current State" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-[var(--color-text-muted)] mt-2">
                                        These hidden traits are exclusively visible to institutional verifiers for visual cross-referencing and are kept strictly off the public certificate.
                                    </p>
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
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    Automation Active
                                </div>
                            </div>

                            <div className="space-y-4">
                                {templates.length > 0 && (
                                    <div className="form-group">
                                        <label className="form-label">Issuance Template</label>
                                        <select
                                            className="select"
                                            value={form.template_id}
                                            onChange={(e) => handleTemplateChange(e.target.value)}
                                            style={{ borderColor: form.template_id ? 'var(--color-accent)' : undefined }}
                                        >
                                            <option value="">Select a Template...</option>
                                            {templates.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

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
                                    <label className="form-label">
                                        Official ID / Reference
                                    </label>
                                    <input className="input" disabled value="SYSTEM-GENERATED" style={{ background: 'var(--color-bg-primary)', fontStyle: 'italic', opacity: 0.6 }} />
                                    <p className="form-hint">A unique sequence will be allocated by the registry.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="form-label">Issuance Date</label>
                                        <input className="input" disabled value="SYSTEM-GENERATED (TODAY)" style={{ background: 'var(--color-bg-primary)', fontStyle: 'italic', opacity: 0.6 }} />
                                    </div>
                                </div>
                                <div className="p-3 bg-[var(--color-bg-elevated)] rounded border border-[var(--color-border)] flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                                    Lifecycle rules and expiry dates will apply automatically based on classification.
                                </div>
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

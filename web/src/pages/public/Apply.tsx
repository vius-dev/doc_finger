import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { applyInstitution } from '../../services/api';

const institutionTypes = [
    { value: 'university', label: 'University / Education' },
    { value: 'government', label: 'Government Agency' },
    { value: 'professional_body', label: 'Professional Body' },
    { value: 'corporate', label: 'Corporate Entity' },
];

export default function Apply() {
    const [formData, setFormData] = useState({
        legal_name: '',
        institution_code: '',
        institution_type: 'university',
        country_code: '',
        primary_email: '',
        website: '',
        trading_name: '',
        registration_number: '',
    });

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await applyInstitution(formData);
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit application');
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="apply-page">
                <div className="apply-container animate-fade-in text-center">
                    <div className="success-icon mb-6">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold mb-4">Application Received</h1>
                    <p className="text-[var(--color-text-secondary)] mb-8 max-w-md mx-auto">
                        Thank you for your interest in DocFingerprint. We have received your application for <strong>{formData.legal_name}</strong>.
                        Our team will review your details and contact you via <strong>{formData.primary_email}</strong> once your access is provisioned.
                    </p>
                    <Link to="/" className="btn btn-primary btn-lg px-12">
                        Return to Login
                    </Link>
                </div>

                <style>{`
                    .apply-page {
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: radial-gradient(ellipse at top, #0f172a 0%, #0a0f1a 100%);
                        padding: var(--space-6);
                    }
                    .apply-container {
                        background: var(--color-bg-card);
                        border: 1px solid var(--color-border);
                        border-radius: var(--radius-xl);
                        padding: var(--space-10);
                        max-width: 600px;
                        width: 100%;
                    }
                    .success-icon {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        width: 100px;
                        height: 100px;
                        border-radius: 50%;
                        background: rgba(16, 185, 129, 0.1);
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="apply-page">
            <div className="apply-container animate-fade-in">
                <div className="mb-8">
                    <Link to="/" className="text-sm text-[var(--color-text-muted)] hover:text-white flex items-center gap-2 mb-6">
                        ← Back to Login
                    </Link>
                    <h1 className="text-2xl font-bold">Registry Access Application</h1>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">Submit your institution details for verification and API access.</p>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="form-label">Legal Entity Name</label>
                        <input
                            required
                            className="input"
                            placeholder="e.g. Stanford University"
                            value={formData.legal_name}
                            onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="form-label">Requested Institution Code</label>
                        <input
                            required
                            className="input font-mono uppercase"
                            placeholder="e.g. STAN"
                            maxLength={8}
                            value={formData.institution_code}
                            onChange={(e) => setFormData({ ...formData, institution_code: e.target.value.toUpperCase() })}
                        />
                        <p className="form-hint">Used as a prefix for your document fingerprints.</p>
                    </div>

                    <div>
                        <label className="form-label">Institution Type</label>
                        <select
                            className="input"
                            value={formData.institution_type}
                            onChange={(e) => setFormData({ ...formData, institution_type: e.target.value })}
                        >
                            {institutionTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="form-label">Contact Email</label>
                        <input
                            required
                            type="email"
                            className="input"
                            placeholder="registry-admin@institution.edu"
                            value={formData.primary_email}
                            onChange={(e) => setFormData({ ...formData, primary_email: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="form-label">Country (ISO Code)</label>
                        <input
                            required
                            className="input uppercase"
                            placeholder="e.g. US, NG, ZA"
                            maxLength={2}
                            value={formData.country_code}
                            onChange={(e) => setFormData({ ...formData, country_code: e.target.value.toUpperCase() })}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="form-label">Official Website</label>
                        <input
                            className="input"
                            placeholder="https://www.institution.edu"
                            value={formData.website}
                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-2 pt-4">
                        {error && <div className="alert alert-error mb-4">{error}</div>}
                        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                            {loading ? 'Submitting Application...' : 'Submit Application'}
                        </button>
                        <p className="text-center text-xs text-[var(--color-text-muted)] mt-4">
                            By submitting, you agree to our terms of service and registry verification protocols.
                        </p>
                    </div>
                </form>
            </div>

            <style>{`
                .apply-page {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: radial-gradient(ellipse at top, #0f172a 0%, #0a0f1a 100%);
                    padding: var(--space-6);
                }
                .apply-container {
                    background: var(--color-bg-card);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-xl);
                    padding: var(--space-8);
                    max-width: 680px;
                    width: 100%;
                }
            `}</style>
        </div>
    );
}

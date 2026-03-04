import { useAuth } from '../../context/AuthContext';

export default function Settings() {
    const { institution } = useAuth();

    if (!institution) {
        return <div className="loading-center"><div className="spinner spinner-lg" /></div>;
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: 700 }}>
            <div className="page-header">
                <h1 className="page-title">Institution Settings</h1>
                <p className="page-subtitle">View your institution profile</p>
            </div>

            <div className="card mb-6">
                <div className="card-header"><h3 className="card-title">Institution Profile</h3></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                    <div className="form-group">
                        <span className="form-label">Legal Name</span>
                        <span style={{ fontWeight: 500 }}>{institution.legal_name}</span>
                    </div>
                    {institution.trading_name && (
                        <div className="form-group">
                            <span className="form-label">Trading Name</span>
                            <span>{institution.trading_name}</span>
                        </div>
                    )}
                    <div className="form-group">
                        <span className="form-label">Institution Code</span>
                        <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>
                            {institution.institution_code}
                        </code>
                    </div>
                    <div className="form-group">
                        <span className="form-label">Type</span>
                        <span style={{ textTransform: 'capitalize' }}>{institution.institution_type}</span>
                    </div>
                    <div className="form-group">
                        <span className="form-label">Country</span>
                        <span>{institution.country_code}</span>
                    </div>
                    <div className="form-group">
                        <span className="form-label">Status</span>
                        <span className={`badge ${institution.status === 'active' ? 'badge-active' : 'badge-warning'}`}>
                            {institution.status}
                        </span>
                    </div>
                    <div className="form-group">
                        <span className="form-label">Verification Level</span>
                        <span>{institution.verification_level} / 4</span>
                    </div>
                    <div className="form-group">
                        <span className="form-label">Billing Plan</span>
                        <span style={{ textTransform: 'capitalize' }}>{institution.billing_plan}</span>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header"><h3 className="card-title">Contact Information</h3></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                    <div className="form-group">
                        <span className="form-label">Primary Email</span>
                        <span>{institution.primary_email}</span>
                    </div>
                    {institution.technical_email && (
                        <div className="form-group">
                            <span className="form-label">Technical Email</span>
                            <span>{institution.technical_email}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

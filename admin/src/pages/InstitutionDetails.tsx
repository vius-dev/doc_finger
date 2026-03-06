import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    ArrowLeft,
    Mail,
    Globe,
    MapPin,
    Calendar,
    Shield,
    Activity,
    Key,
    AlertTriangle,
    CheckCircle,
    X,
    Copy,
    Check
} from 'lucide-react'
import { adminService, Institution, ApiKey } from '../api/adminService'
import './InstitutionDetails.css'

const InstitutionDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [institution, setInstitution] = useState<(Institution & { document_count: number; verification_count: number }) | null>(null);
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
    const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (id) {
                try {
                    const [instData, keyData] = await Promise.all([
                        adminService.getInstitutionExtended(id),
                        adminService.fetchInstitutionKeys(id)
                    ]);
                    setInstitution(instData);
                    setKeys(keyData);
                } catch (error) {
                    console.error('Failed to fetch institution details:', error);
                }
            }
            setLoading(false);
        };
        fetchData();
    }, [id]);

    const handleStatusChange = async () => {
        if (!institution) return;

        let newStatus: Institution['status'];
        let actionLabel: string;

        if (institution.status === 'pending') {
            newStatus = 'active';
            actionLabel = 'approve and activate';
        } else if (institution.status === 'active') {
            newStatus = 'suspended';
            actionLabel = 'suspend';
        } else {
            newStatus = 'active';
            actionLabel = 're-activate';
        }

        if (!confirm(`Are you sure you want to ${actionLabel} this organisation?`)) return;

        try {
            const updated = await adminService.updateInstitutionStatus(institution.id, newStatus);
            setInstitution({ ...institution, status: updated.status });
        } catch (error) {
            alert('Status update failed');
            console.error(error);
        }
    };

    const handleVerify = async () => {
        if (!institution) return;
        const nextLevel = (institution.verification_level || 0) + 1;
        if (nextLevel > 4) {
            alert('Maximum verification level reached.');
            return;
        }

        if (!confirm(`Promote to Verification Level ${nextLevel}?`)) return;

        try {
            const updated = await adminService.verifyInstitution(institution.id, nextLevel);
            setInstitution({
                ...institution,
                verification_level: updated.verification_level,
                verified_at: updated.verified_at
            });
        } catch (error) {
            alert('Verification update failed');
            console.error(error);
        }
    };

    const handleGenerateFirstKey = async () => {
        if (!institution) return;
        const name = `Initial Key (${institution.institution_code})`;
        try {
            const result = await adminService.generateKey(institution.id, name, 'test');
            setGeneratedSecret(result.api_key);
            setIsKeyModalOpen(true);

            // Refresh keys
            const keyData = await adminService.fetchInstitutionKeys(institution.id);
            setKeys(keyData);
        } catch (error) {
            alert('Key generation failed');
            console.error(error);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    if (loading) return <div className="loading-state">Retrieving Institution Details...</div>;
    if (!institution) return <div className="error-state">Institution not found.</div>;

    return (
        <div className="details-page">
            <div className="details-header">
                <button className="back-btn" onClick={() => navigate('/institutions')}>
                    <ArrowLeft size={20} />
                    <span>Back to List</span>
                </button>
                <div className="header-main">
                    <div className="title-area">
                        <h1>{institution.legal_name}</h1>
                        <div className="badges">
                            <span className={`status-badge status-${institution.status}`}>
                                {institution.status}
                            </span>
                            <span className="level-badge">
                                <Shield size={14} />
                                Level {institution.verification_level}
                            </span>
                        </div>
                    </div>
                    <div className="header-actions">
                        {institution.status === 'pending' ? (
                            <button className="btn-primary" onClick={handleStatusChange}>
                                <CheckCircle size={18} />
                                <span>Approve & Activate</span>
                            </button>
                        ) : (
                            <button
                                className={`btn-secondary ${institution.status === 'suspended' ? 'active-btn' : ''}`}
                                onClick={handleStatusChange}
                            >
                                {institution.status === 'suspended' ? 'Re-activate Access' : 'Suspend Access'}
                            </button>
                        )}
                        <button className="btn-outline" onClick={handleVerify}>
                            <Shield size={18} />
                            <span>Level {institution.verification_level < 4 ? 'Up' : 'Max'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="details-grid">
                {/* Profile Card */}
                <section className="profile-section card">
                    <div className="section-title">Organisation Profile</div>
                    <div className="info-list">
                        <InfoItem icon={Globe} label="Institution Code" value={institution.institution_code} isCode />
                        <InfoItem icon={Mail} label="Primary Email" value={institution.primary_email} />
                        <InfoItem icon={MapPin} label="Country" value={institution.country_code} />
                        <InfoItem icon={Calendar} label="Registered" value={new Date(institution.created_at).toLocaleDateString()} />
                        {institution.verified_at && (
                            <InfoItem icon={CheckCircle} label="Verified At" value={new Date(institution.verified_at).toLocaleDateString()} />
                        )}
                        <InfoItem icon={Activity} label="organisation Type" value={institution.institution_type.replace('_', ' ')} />
                    </div>
                </section>

                {/* Stats Card */}
                <section className="stats-section card">
                    <div className="section-title">Usage Statistics</div>
                    <div className="mini-stats">
                        <div className="mini-stat">
                            <span className="mini-label">Documents</span>
                            <span className="mini-value">{institution.document_count}</span>
                        </div>
                        <div className="mini-stat">
                            <span className="mini-label">Verifications</span>
                            <span className="mini-value">{institution.verification_count}</span>
                        </div>
                    </div>
                    <div className="usage-chart-placeholder">
                        {/* Simple CSS-based bar chart mock */}
                        <div className="usage-bars">
                            {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                                <div key={i} className="usage-bar-col" style={{ height: `${h}%` }}></div>
                            ))}
                        </div>
                        <div className="chart-labels">
                            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                        </div>
                    </div>
                </section>

                {/* API Keys Section */}
                <section className="keys-section card">
                    <div className="section-title">
                        <div className="title-with-icon">
                            <Key size={18} />
                            <span>Active API Keys</span>
                        </div>
                        <button className="text-btn" onClick={() => navigate('/keys')}>Manage Keys</button>
                    </div>
                    <div className="key-list">
                        {keys.length > 0 ? keys.map(key => (
                            <div key={key.id} className="key-item">
                                <div className="key-info">
                                    <span className="key-label">{key.name} ({key.environment})</span>
                                    <code className="key-preview">{key.key_preview}</code>
                                </div>
                                <span className={`status-dot ${key.status}`}></span>
                            </div>
                        )) : (
                            <div className="no-keys-container">
                                <p className="no-keys">No keys found for this organisation.</p>
                                <button className="btn-primary btn-sm" onClick={handleGenerateFirstKey}>
                                    Generate Test Key
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* Risk / Alerts Section */}
                <section className="risk-section card">
                    <div className="section-title">System Alerts</div>
                    <div className="alert-list">
                        <div className="alert-item warning">
                            <AlertTriangle size={18} />
                            <div className="alert-text">
                                <h4>Verification Threshold</h4>
                                <p>Organisation has reached 80% of daily verification limit.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Audit Log Section */}
                <section className="audit-section card">
                    <div className="section-title">Recent Audit Log</div>
                    <div className="audit-list">
                        <AuditItem
                            action="Status Changed"
                            user="System Admin"
                            time="2 hours ago"
                            detail="Organisation moved from Pending to Active."
                        />
                        <AuditItem
                            action="API Key Created"
                            user="Root Account"
                            time="3 days ago"
                            detail="Production API key generated for pilot onboarding."
                        />
                    </div>
                </section>
            </div>

            {/* Key Reveal Modal */}
            {isKeyModalOpen && generatedSecret && (
                <div className="modal-overlay">
                    <div className="modal-content glass-panel card">
                        <div className="modal-header">
                            <h2>Key Generated Successfully</h2>
                            <button className="close-btn" onClick={() => setIsKeyModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="success-view">
                            <p className="warning-text-box">
                                <AlertTriangle size={16} />
                                This key will only be shown once. Copy it now.
                            </p>
                            <div className="key-reveal-box">
                                <code>{generatedSecret}</code>
                                <button
                                    className="icon-btn"
                                    onClick={() => copyToClipboard(generatedSecret)}
                                >
                                    {copied ? <Check size={20} className="text-success" /> : <Copy size={20} />}
                                </button>
                            </div>
                            <button className="btn-secondary wide" onClick={() => setIsKeyModalOpen(false)}>I have saved the key</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const InfoItem: React.FC<{ icon: any, label: string, value: string, isCode?: boolean }> = ({
    icon: Icon, label, value, isCode
}) => (
    <div className="info-item">
        <Icon size={18} className="info-icon" />
        <div className="info-content">
            <span className="info-label">{label}</span>
            <span className={`info-value ${isCode ? 'code-font' : ''}`}>{value}</span>
        </div>
    </div>
);

const AuditItem: React.FC<{ action: string, user: string, time: string, detail: string }> = ({
    action, user, time, detail
}) => (
    <div className="audit-item">
        <div className="audit-header">
            <span className="audit-action">{action}</span>
            <span className="audit-time">{time}</span>
        </div>
        <div className="audit-user">by {user}</div>
        <p className="audit-detail">{detail}</p>
    </div>
);

export default InstitutionDetails

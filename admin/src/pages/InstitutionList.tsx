import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Search,
    Filter,
    Plus,
    MoreVertical,
    X,
    Loader2
} from 'lucide-react'
import { adminService, Institution } from '../api/adminService'
import './InstitutionList.css'

const InstitutionList: React.FC = () => {
    const navigate = useNavigate();
    const [institutions, setInstitutions] = useState<(Institution & { document_count?: number })[]>([]);
    const [filtered, setFiltered] = useState<(Institution & { document_count?: number })[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newInstData, setNewInstData] = useState({
        legal_name: '',
        institution_code: '',
        institution_type: 'university',
        country_code: '',
        primary_email: '',
        trading_name: '',
        registration_number: '',
        website: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await adminService.fetchInstitutions();
                setInstitutions(data);
                setFiltered(data);
            } catch (error) {
                console.error('Failed to fetch institutions:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        let result = institutions;
        if (searchTerm) {
            result = result.filter(i =>
                i.legal_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                i.institution_code.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (statusFilter !== 'all') {
            result = result.filter(i => i.status === statusFilter);
        }
        setFiltered(result);
    }, [searchTerm, statusFilter, institutions]);

    const handleRowClick = (id: string) => {
        navigate(`/institutions/${id}`);
    };

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const newInst = await adminService.createInstitution(newInstData);
            setInstitutions([newInst, ...institutions]);
            setIsAddModalOpen(false);
            setNewInstData({
                legal_name: '',
                institution_code: '',
                institution_type: 'university',
                country_code: '',
                primary_email: '',
                trading_name: '',
                registration_number: '',
                website: ''
            });
        } catch (error) {
            const msg = error instanceof Error ? error.message : JSON.stringify(error);
            alert(`Failed to add institution: ${msg}`);
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="loading-state">Loading Institutions...</div>;

    return (
        <div className="list-page">
            <div className="page-header">
                <div className="header-text">
                    <h1>Institutions</h1>
                    <p className="subtitle">Manage all registered organisations and pilot partners</p>
                </div>
                <div className="header-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        className="btn-secondary"
                        onClick={async () => {
                            try {
                                const res = await adminService.testDebugEndpoint();
                                alert(`Debug Success: ${JSON.stringify(res)}`);
                            } catch (e) {
                                alert(`Debug Failed: ${e instanceof Error ? e.message : String(e)}`);
                            }
                        }}
                    >
                        Test Connection
                    </button>
                    <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
                        <Plus size={20} />
                        <span>Add Institution</span>
                    </button>
                </div>
            </div>

            {/* Modal for Adding Institution */}
            {isAddModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass-panel card" style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>Register New Institution</h2>
                            <button className="close-btn" onClick={() => setIsAddModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="gen-form">
                            <div className="form-group">
                                <label>Legal Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Acme University"
                                    value={newInstData.legal_name}
                                    onChange={e => setNewInstData({ ...newInstData, legal_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Institution Code *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. ACME"
                                        value={newInstData.institution_code}
                                        onChange={e => setNewInstData({ ...newInstData, institution_code: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Country Code *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. US, UK, NG"
                                        maxLength={2}
                                        value={newInstData.country_code}
                                        onChange={e => setNewInstData({ ...newInstData, country_code: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Institution Type *</label>
                                <select
                                    value={newInstData.institution_type}
                                    onChange={e => setNewInstData({ ...newInstData, institution_type: e.target.value })}
                                    required
                                >
                                    <option value="university">University</option>
                                    <option value="professional_body">Professional Body</option>
                                    <option value="government">Government</option>
                                    <option value="corporate">Corporate</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Primary Email *</label>
                                <input
                                    type="email"
                                    placeholder="admin@institution.edu"
                                    value={newInstData.primary_email}
                                    onChange={e => setNewInstData({ ...newInstData, primary_email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Website (Optional)</label>
                                <input
                                    type="url"
                                    placeholder="https://institution.edu"
                                    value={newInstData.website}
                                    onChange={e => setNewInstData({ ...newInstData, website: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="btn-primary wide" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Register Institution'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Filters Bar */}
            <div className="filters-bar card">
                <div className="search-wrapper">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by name or code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <div className="filter-item">
                        <Filter size={18} />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>
                    <button className="export-btn">Export CSV</button>
                </div>
            </div>

            {/* Institutions Table */}
            <div className="table-container card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Institution</th>
                            <th>Code</th>
                            <th>Sector</th>
                            <th>Status</th>
                            <th>Usage</th>
                            <th>Created</th>
                            <th className="actions-cell"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((inst) => (
                            <tr key={inst.id} onClick={() => handleRowClick(inst.id)}>
                                <td>
                                    <div className="inst-cell">
                                        <div className={`inst-avatar type-${inst.institution_type}`}>
                                            {inst.legal_name.charAt(0)}
                                        </div>
                                        <div className="inst-cell-info">
                                            <span className="inst-name">{inst.legal_name}</span>
                                            <span className="inst-email">{inst.primary_email}</span>
                                        </div>
                                    </div>
                                </td>
                                <td><code className="code-tag">{inst.institution_code}</code></td>
                                <td className="capitalize">{inst.institution_type.replace('_', ' ')}</td>
                                <td>
                                    <span className={`status-badge status-${inst.status}`}>
                                        {inst.status}
                                    </span>
                                </td>
                                <td>
                                    <div className="usage-cell">
                                        <span>{inst.document_count || 0} docs</span>
                                        <div className="usage-bar">
                                            <div className="usage-fill" style={{ width: `${Math.min(((inst.document_count || 0) / 1000) * 100, 100)}%` }}></div>
                                        </div>
                                    </div>
                                </td>
                                <td>{new Date(inst.created_at).toLocaleDateString()}</td>
                                <td className="actions-cell">
                                    <button className="icon-btn" onClick={(e) => {
                                        e.stopPropagation();
                                        // Action menu
                                    }}>
                                        <MoreVertical size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filtered.length === 0 && (
                    <div className="empty-results">
                        <p>No institutions found matching your criteria.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default InstitutionList

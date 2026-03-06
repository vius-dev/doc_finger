import React, { useEffect, useState } from 'react'
import {
    Users,
    FileText,
    CheckCircle,
    TrendingUp,
    ArrowUpRight,
    Clock
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { adminService, DashboardStats, Institution } from '../api/adminService'
import './AdminDashboard.css'

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentInstitutions, setRecentInstitutions] = useState<Institution[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [s, insts, acts] = await Promise.all([
                    adminService.fetchDashboardStats(),
                    adminService.fetchInstitutions(),
                    adminService.fetchRecentActivity()
                ]);
                setStats(s);
                setRecentInstitutions(insts.slice(0, 5));
                setActivities(acts);
            } catch (error) {
                console.error('Dashboard load failed:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="loading-state">Initialising System...</div>;

    return (
        <div className="dashboard-page">
            <div className="page-header">
                <h1>Overview</h1>
                <p className="subtitle">Real-time system health and institution activity</p>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <StatCard
                    label="Total Institutions"
                    value={stats?.totalInstitutions || 0}
                    icon={Users}
                    trend="+12% from last month"
                    color="blue"
                />
                <StatCard
                    label="Active Documents"
                    value={stats?.activeDocuments.toLocaleString() || '0'}
                    icon={FileText}
                    trend="+850 this week"
                    color="purple"
                />
                <StatCard
                    label="Verifications"
                    value={stats?.totalVerifications.toLocaleString() || '0'}
                    icon={CheckCircle}
                    trend="99.9% success rate"
                    color="green"
                />
                <StatCard
                    label="System Growth"
                    value={`${stats?.systemGrowth}%`}
                    icon={TrendingUp}
                    trend="Target: 20%"
                    color="orange"
                />
            </div>

            <div className="dashboard-content">
                {/* Recent Institutions */}
                <section className="recent-section">
                    <div className="section-header">
                        <h3>Recent Institutions</h3>
                        <button className="view-all-btn">View All</button>
                    </div>
                    <div className="institution-list-mini">
                        {recentInstitutions.map((inst) => (
                            <div key={inst.id} className="inst-item-mini card" onClick={() => navigate(`/institutions/${inst.id}`)}>
                                <div className={`inst-icon-placeholder type-${inst.institution_type}`}>
                                    {inst.legal_name.charAt(0)}
                                </div>
                                <div className="inst-info">
                                    <h4>{inst.legal_name}</h4>
                                    <span>{inst.institution_code} • {inst.country_code}</span>
                                </div>
                                <div className={`status-badge status-${inst.status}`}>
                                    {inst.status}
                                </div>
                                <ArrowUpRight size={18} className="item-arrow" />
                            </div>
                        ))}
                    </div>
                </section>

                {/* System Activity */}
                <section className="activity-section">
                    <div className="section-header">
                        <h3>System Activity</h3>
                    </div>
                    <div className="activity-feed card">
                        {activities.length > 0 ? activities.map(act => (
                            <ActivityItem
                                key={act.id}
                                icon={Clock}
                                title={act.action}
                                time={new Date(act.occurred_at).toLocaleTimeString()}
                                description={`Performed by ${act.actor_type}: ${act.resource_type} updated.`}
                            />
                        )) : (
                            <p className="no-data">No recent activity found.</p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    )
}

interface StatCardProps {
    label: string;
    value: string | number;
    icon: any;
    trend: string;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, trend, color }) => (
    <div className={`stat-card card animate-fade color-${color}`}>
        <div className="stat-icon">
            <Icon size={24} />
        </div>
        <div className="stat-data">
            <span className="stat-label">{label}</span>
            <h2 className="stat-value">{value}</h2>
            <span className="stat-trend">{trend}</span>
        </div>
    </div>
);

const ActivityItem: React.FC<{ icon: any, title: string, time: string, description: string }> = ({
    icon: Icon, title, time, description
}) => (
    <div className="activity-item">
        <div className="activity-icon-wrapper">
            <Icon size={16} />
        </div>
        <div className="activity-details">
            <div className="activity-header">
                <h4>{title}</h4>
                <span>{time}</span>
            </div>
            <p>{description}</p>
        </div>
    </div>
);

export default AdminDashboard

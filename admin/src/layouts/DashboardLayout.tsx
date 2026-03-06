import React, { useEffect, useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    Building2,
    Key,
    Settings,
    LogOut,
    ChevronRight,
    Fingerprint
} from 'lucide-react'
import { adminService } from '../api/adminService'
import './DashboardLayout.css'

const DashboardLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        try {
            await adminService.signOut();
            navigate('/login');
        } catch (error) {
            console.error('Sign out failed:', error);
        }
    };

    const [displayName, setDisplayName] = useState<string>('Admin');

    useEffect(() => {
        // We always show 'Admin' as per user requirement, but we still check session
        const checkUser = async () => {
            await adminService.getCurrentUser();
            setDisplayName('Admin');
        };
        checkUser();
    }, []);

    const navItems = [
        { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
        { path: '/institutions', label: 'Institutions', icon: Building2 },
        { path: '/keys', label: 'Admin Keys', icon: Key },
        { path: '/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="layout-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="brand-icon">
                        <Fingerprint size={32} />
                    </div>
                    <div className="brand-text">
                        <h2>DocFinger</h2>
                        <span>Admin Control</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-group">
                        <div className="nav-group-label">Main Menu</div>
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            >
                                <item.icon size={20} className="nav-icon" />
                                <span>{item.label}</span>
                                <ChevronRight size={16} className="nav-arrow" />
                            </NavLink>
                        ))}
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <div className="admin-user-info">
                        <div className="admin-avatar">{displayName.charAt(0).toUpperCase()}</div>
                        <span className="admin-name">{displayName}</span>
                    </div>
                    <button className="logout-btn" onClick={handleSignOut}>
                        <LogOut size={20} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <header className="content-header">
                    <div className="breadcrumb">
                        <span>Admin</span>
                        <ChevronRight size={16} />
                        <span className="current-page">
                            {navItems.find(i => i.path === location.pathname)?.label || 'Details'}
                        </span>
                    </div>
                    <div className="header-actions">
                        <div className="admin-badge">{displayName}</div>
                    </div>
                </header>

                <div className="content-area animate-fade">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}

export default DashboardLayout

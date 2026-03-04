import { useState } from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { name: 'Documents', path: '/dashboard', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { name: 'Register', path: '/dashboard/register', icon: 'M12 4v16m8-8H4' },
  { name: 'Templates', path: '/dashboard/templates', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { name: 'Bulk Upload', path: '/dashboard/bulk-upload', icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5' },
  { name: 'Analytics', path: '/dashboard/analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { name: 'API Keys', path: '/dashboard/keys', icon: 'M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z' },
  { name: 'Settings', path: '/dashboard/settings', icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z' },
];

export default function DashboardLayout() {
  const { isAuthenticated, isLoading, institution, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="loading-center" style={{ minHeight: '100vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className={`dashboard ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
      {/* Mobile Header Overlay */}
      <div className="mobile-header">
        <div className="sidebar-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
          </svg>
          <span>DocFingerprint</span>
        </div>
        <button className="btn btn-ghost" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && <div className="sidebar-overlay" onClick={closeMobileMenu} />}

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span>DocFingerprint</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
              }
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{institution?.legal_name ?? 'Institution'}</div>
              <div className="sidebar-user-code">{institution?.institution_code ?? ''}</div>
            </div>
            <button className="btn btn-ghost" onClick={logout} title="Logout" style={{ padding: '6px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <Outlet />
      </main>

      <style>{`
        .dashboard {
          display: flex;
          min-height: 100vh;
          position: relative;
        }
        .mobile-header {
          display: none;
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 60px;
          background: var(--color-bg-sidebar);
          border-bottom: 1px solid var(--color-border);
          padding: 0 var(--space-4);
          z-index: 100;
          align-items: center;
          justify-content: space-between;
        }
        .sidebar-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          z-index: 40;
        }
        .sidebar {
          width: var(--sidebar-width);
          background: var(--color-bg-sidebar);
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          z-index: 50;
          transition: transform var(--transition-base);
        }
        .sidebar-header {
          padding: var(--space-4) var(--space-5);
          border-bottom: 1px solid var(--color-border);
        }
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          color: var(--color-text-primary);
          font-weight: 700;
          font-size: var(--text-lg);
        }
        .sidebar-logo svg { color: var(--color-accent); }
        .sidebar-nav {
          flex: 1;
          padding: var(--space-3);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-2) var(--space-3);
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--color-text-secondary);
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
          text-decoration: none;
        }
        .sidebar-link:hover {
          background: var(--color-bg-hover);
          color: var(--color-text-primary);
        }
        .sidebar-link-active {
          background: var(--color-accent-subtle);
          color: var(--color-accent);
        }
        .sidebar-link-active svg { color: var(--color-accent); }
        .sidebar-footer {
          padding: var(--space-4) var(--space-3);
          border-top: 1px solid var(--color-border);
        }
        .sidebar-user {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .sidebar-user-info { flex: 1; min-width: 0; }
        .sidebar-user-name {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--color-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sidebar-user-code {
          font-size: var(--text-xs);
          color: var(--color-text-muted);
          font-family: var(--font-mono);
        }
        .main-content {
          flex: 1;
          margin-left: var(--sidebar-width);
          padding: var(--space-8);
          min-height: 100vh;
        }

        @media (max-width: 1024px) {
          :root { --sidebar-width: 240px; }
        }

        @media (max-width: 768px) {
          .mobile-header { display: flex; }
          .sidebar {
            transform: translateX(-100%);
            width: 280px;
          }
          .sidebar-open {
            transform: translateX(0);
          }
          .main-content {
            margin-left: 0;
            padding-top: calc(60px + var(--space-6));
            padding-left: var(--space-4);
            padding-right: var(--space-4);
          }
        }
      `}</style>
    </div>
  );
}

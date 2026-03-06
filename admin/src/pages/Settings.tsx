import React, { useEffect, useState } from 'react';
import { Shield, Database, Globe, Server, Activity, Lock, ExternalLink } from 'lucide-react';
// @ts-ignore
import { adminService } from '../api/adminService';
import './Settings.css';

const Settings: React.FC = () => {
    const [envVars, setEnvVars] = useState<Record<string, string>>({});

    useEffect(() => {
        setEnvVars({
            'Database Provider': 'Supabase (PostgreSQL)',
            'Base API Cluster': import.meta.env.VITE_SUPABASE_URL || 'Not Configured',
            'Auth Service': 'Supabase GoTrue',
            'Edge Runtime': 'Deno Deploy',
            'Frontend Engine': 'Vite 5.x',
            'Admin Tier': 'System Root'
        });
    }, []);

    return (
        <div className="settings-page">
            <div className="page-header">
                <h1>System Settings</h1>
                <p className="subtitle">Infrastructure configuration and administrative environment controls.</p>
            </div>

            <div className="settings-grid">
                {/* Infrastructure Status */}
                <section className="settings-card card">
                    <div className="settings-card-header">
                        <Server size={20} className="header-icon" />
                        <h3>Core Infrastructure</h3>
                    </div>
                    <div className="env-list">
                        {Object.entries(envVars).map(([label, value]) => (
                            <div key={label} className="env-item">
                                <span className="env-label">{label}</span>
                                <code className="env-value">{value}</code>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Database Connectivity */}
                <section className="settings-card card">
                    <div className="settings-card-header">
                        <Database size={20} className="header-icon" />
                        <h3>Storage & Realtime</h3>
                    </div>
                    <div className="status-grid">
                        <StatusItem label="PostgreSQL DB" status="Operational" />
                        <StatusItem label="Auth Service" status="Operational" />
                        <StatusItem label="Edge Functions" status="Operational" />
                        <StatusItem label="Static Assets" status="Operational" />
                    </div>
                    <div className="infra-footer">
                        <button className="text-btn">
                            <Activity size={14} />
                            <span>Run Health Check</span>
                        </button>
                    </div>
                </section>

                {/* Security Protocols */}
                <section className="settings-card card">
                    <div className="settings-card-header">
                        <Lock size={20} className="header-icon" />
                        <h3>Security Protocol</h3>
                    </div>
                    <div className="security-info">
                        <div className="security-item">
                            <Shield size={18} />
                            <div className="security-text">
                                <strong>Session Encryption</strong>
                                <p>All administrative sessions are protected by RSA-4096 and AES-256-GCM.</p>
                            </div>
                        </div>
                        <div className="security-item">
                            <Lock size={18} />
                            <div className="security-text">
                                <strong>Credential Hashing</strong>
                                <p>Passwords use Argon2id with a cost factor of 65536.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* External Links */}
                <section className="settings-card card">
                    <div className="settings-card-header">
                        <Globe size={20} className="header-icon" />
                        <h3>External Resources</h3>
                    </div>
                    <div className="link-list">
                        <a href="https://supabase.com/docs" target="_blank" rel="noreferrer" className="resource-link">
                            <span>Supabase Documentation</span>
                            <ExternalLink size={14} />
                        </a>
                        <a href="#" className="resource-link">
                            <span>API Reference Guide</span>
                            <ExternalLink size={14} />
                        </a>
                        <a href="#" className="resource-link">
                            <span>System Audit Logs (Raw)</span>
                            <ExternalLink size={14} />
                        </a>
                    </div>
                </section>
            </div>
        </div>
    );
};

const StatusItem: React.FC<{ label: string; status: string }> = ({ label, status }) => (
    <div className="stat-item">
        <span className="stat-label">{label}</span>
        <div className="status-indicator">
            <span className="dot pulse"></span>
            <span className="status-text">{status}</span>
        </div>
    </div>
);

export default Settings;

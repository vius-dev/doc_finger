import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../../services/api';
import { useExportPDF } from '../../hooks/useExportPDF';

export default function DocumentDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [doc, setDoc] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const [revoking, setRevoking] = useState(false);
    const { exportPDF, exporting } = useExportPDF();

    const fetchDoc = async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const data = await api.getDocument(id);
            setDoc(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDoc();
    }, [id]);

    // PDF Export handled by useExportPDF hook

    async function handleRevoke() {
        if (!doc) return;
        if (!confirm('Are you sure you want to revoke this document? This action is permanent and will instantly invalidate it.')) {
            return;
        }

        setRevoking(true);
        try {
            await api.revokeDocument(doc.fingerprint_id, 'Admin revocation via dashboard');
            await fetchDoc(); // Reload to get updated status
        } catch (err: any) {
            alert(err.message || 'Failed to revoke document');
        } finally {
            setRevoking(false);
        }
    }

    function getStatusConfig(status: string) {
        const configs: Record<string, { label: string; sub: string; color: string; bg: string; icon: string }> = {
            active: {
                label: 'Verified & Active',
                sub: 'This document is authentic and currently valid.',
                color: 'var(--color-success)',
                bg: 'var(--color-success-bg)',
                icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
            },
            revoked: {
                label: 'Revoked',
                sub: 'This document was manually invalidated.',
                color: 'var(--color-danger)',
                bg: 'var(--color-danger-bg)',
                icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
            },
            expired: {
                label: 'Expired',
                sub: 'The validity period for this document has ended.',
                color: 'var(--color-text-muted)',
                bg: 'rgba(100, 116, 139, 0.1)',
                icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
            },
            expired_grace: {
                label: 'Expired (Grace Period)',
                sub: 'Validity has ended but is currently in grace period.',
                color: 'var(--color-info)',
                bg: 'rgba(6, 182, 212, 0.1)',
                icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
            }
        };
        return configs[status] ?? configs.expired;
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    if (loading) {
        return (
            <div className="animate-fade-in p-8">
                <button onClick={() => navigate(-1)} className="btn btn-ghost mb-6">
                    ← Back to Documents
                </button>
                <div className="loading-center"><div className="spinner spinner-lg" /></div>
            </div>
        );
    }

    if (error || !doc) {
        return (
            <div className="animate-fade-in p-8">
                <button onClick={() => navigate(-1)} className="btn btn-ghost mb-6">
                    ← Back to Documents
                </button>
                <div className="alert alert-error">{error || 'Document not found'}</div>
            </div>
        );
    }

    const statusConfig = getStatusConfig(doc.status);

    return (
        <div className="animate-fade-in max-w-5xl">
            {/* Screen UI - Hidden on Print */}
            <div className="no-print">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                    <button onClick={() => navigate(-1)} className="btn btn-ghost">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}>
                            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Back to Registry
                    </button>

                    <div className="flex gap-3 flex-wrap">
                        <button
                            className="btn btn-secondary flex items-center gap-2"
                            onClick={() => window.open(`${window.location.origin}/verify/${doc.fingerprint_id}`, '_blank')}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                            Preview Certificate
                        </button>
                        <button
                            className="btn btn-secondary flex items-center gap-2"
                            onClick={() => exportPDF(printRef.current, { fileName: `Document-${doc.fingerprint_id}` })}
                            disabled={exporting}
                        >
                            {exporting ? (
                                <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                            {exporting ? 'Generating...' : 'Download PDF'}
                        </button>
                        <button className="btn btn-primary flex items-center gap-2" onClick={() => window.print()}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-10 0v5h8v-5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Print Report
                        </button>
                    </div>
                </div>

                {/* Status Banner */}
                <div className="card mb-8" style={{ background: statusConfig.bg, borderLeft: `4px solid ${statusConfig.color}`, padding: 'var(--space-5)' }}>
                    <div className="flex items-center gap-4">
                        <div style={{ color: statusConfig.color }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d={statusConfig.icon} strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div>
                            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: statusConfig.color, marginBottom: 2 }}>{statusConfig.label}</h2>
                            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{statusConfig.sub}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-stack grid-cols-1 grid-cols-3-lg gap-8">
                    {/* Main Identity Area */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="card">
                            <div className="card-header flex justify-between items-center flex-wrap gap-2">
                                <h3 className="card-title">Issuance Identity</h3>
                                <span className="badge badge-active" style={{ textTransform: 'capitalize' }}>{doc.document_type.replace(/_/g, ' ')}</span>
                            </div>

                            <div className="grid grid-cols-1 grid-cols-2-md gap-y-6 gap-x-12 py-4">
                                <div>
                                    <label className="form-label mb-1 block">Recipient Full Name</label>
                                    <div className="text-xl font-bold text-[var(--color-text-primary)]">{doc.recipient_name}</div>
                                </div>
                                {doc.recipient_additional && (() => {
                                    const email = doc.recipient_additional.find((s: string) => s.startsWith('email:'))?.substring(6);
                                    const phone = doc.recipient_additional.find((s: string) => s.startsWith('phone:'))?.substring(6);
                                    const idSource = doc.recipient_additional.find((s: string) => !s.startsWith('email:') && !s.startsWith('phone:'));
                                    return (
                                        <>
                                            {email && (
                                                <div>
                                                    <label className="form-label mb-1 block">Registered Email</label>
                                                    <div className="text-sm font-medium">{email}</div>
                                                </div>
                                            )}
                                            {phone && (
                                                <div>
                                                    <label className="form-label mb-1 block">Registered Phone</label>
                                                    <div className="text-sm font-medium">{phone}</div>
                                                </div>
                                            )}
                                            {idSource && (() => {
                                                const parts = idSource.split(':');
                                                const rawType = parts[0] || '';
                                                const idNum = parts.slice(1).join(':') || '';
                                                // Clean up the type string (e.g., "national_id" -> "National id")
                                                const typeDisplay = rawType
                                                    .replace(/_/g, ' ')
                                                    .replace(/^./, (str: string) => str.toUpperCase());
                                                return (
                                                    <div>
                                                        <label className="form-label mb-1 block">Official ID</label>
                                                        <div className="text-sm font-medium">
                                                            <span className="text-xs font-bold text-[var(--color-text-muted)] mr-2">{typeDisplay}</span>
                                                            {idNum}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </>
                                    );
                                })()}
                                <div>
                                    <label className="form-label mb-1 block">Document Number</label>
                                    <div className="font-mono text-sm uppercase tracking-tight">{doc.document_number || 'NOT PROVIDED'}</div>
                                </div>
                                <div>
                                    <label className="form-label mb-1 block">Issuance Date</label>
                                    <div className="flex items-center gap-2">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-text-muted)' }}>
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                        </svg>
                                        <span>{new Date(doc.issue_date).toLocaleDateString('en-US', { dateStyle: 'long' })}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label mb-1 block">Expiration Date</label>
                                    <div className="flex items-center gap-2">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-text-muted)' }}>
                                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                        </svg>
                                        <span style={{ color: doc.status === 'expired' ? 'var(--color-danger)' : 'inherit' }}>
                                            {doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString('en-US', { dateStyle: 'long' }) : 'Indefinite'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-[var(--color-border)]">
                                <label className="form-label mb-2 block">System Fingerprint</label>
                                <div className="flex items-center gap-2 bg-[var(--color-bg-input)] p-3 rounded-md border border-[var(--color-border)] group overflow-hidden">
                                    <code className="flex-1 font-mono text-sm text-[var(--color-accent)] truncate">{doc.fingerprint_id}</code>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => copyToClipboard(doc.fingerprint_id)}
                                        title="Copy Fingerprint"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header"><h3 className="card-title">Cryptographic Evidence</h3></div>
                            <div className="space-y-6 py-2">
                                <div>
                                    <label className="form-label mb-2 block">Immutable SHA-256 Content Hash</label>
                                    <div className="flex gap-2 items-start bg-[var(--color-bg-input)] p-4 rounded-md border border-[var(--color-border)] overflow-hidden">
                                        <code className="flex-1 font-mono text-xs break-all text-[var(--color-text-secondary)] leading-relaxed">
                                            {doc.sha256_hash}
                                        </code>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => navigator.clipboard.writeText(doc.sha256_hash)}
                                            title="Copy Hash"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 grid-cols-2-md gap-6">
                                    <div>
                                        <label className="form-label mb-1 block">Algorithm</label>
                                        <div className="text-sm font-semibold">SHA-256 / Ed25519</div>
                                    </div>
                                    <div>
                                        <label className="form-label mb-1 block">Network Status</label>
                                        <div className="flex items-center gap-2 text-sm text-[var(--color-success)]">
                                            <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
                                            Confirmed on Mainnet
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Anti-Fraud Highlight */}
                        {doc.document_metadata && ['height', 'gender', 'state'].some(k => doc.document_metadata![k]) && (
                            <div className="card" style={{ background: 'var(--color-bg-primary)', borderLeft: '4px solid var(--color-accent)' }}>
                                <div className="card-header flex justify-between items-center">
                                    <h3 className="card-title">Anti-Fraud Physical Traits</h3>
                                    <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">Internal Only</div>
                                </div>
                                <div className="grid grid-cols-1 grid-cols-3-md gap-4">
                                    {['height', 'gender', 'state'].map(key => doc.document_metadata![key] && (
                                        <div key={key}>
                                            <label className="form-label mb-1 block" style={{ textTransform: 'capitalize' }}>{key}</label>
                                            <div className="text-lg font-bold">{String(doc.document_metadata![key])}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Extended Data */}
                        {doc.document_metadata && Object.keys(doc.document_metadata).filter(k => !['height', 'gender', 'state'].includes(k)).length > 0 && (
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title">Supplemental Metadata</h3>
                                </div>
                                <div className="grid grid-cols-1 grid-cols-2-md gap-6">
                                    {Object.entries(doc.document_metadata)
                                        .filter(([key]) => !['height', 'gender', 'state'].includes(key))
                                        .map(([key, value]) => (
                                            <div key={key}>
                                                <label className="form-label mb-1 block" style={{ textTransform: 'capitalize' }}>
                                                    {key.replace(/_/g, ' ')}
                                                </label>
                                                <div className="text-sm font-medium">{String(value)}</div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar Info Area */}
                    <div className="space-y-8">
                        <div className="card">
                            <div className="card-header"><h3 className="card-title">Registration Metrics</h3></div>
                            <div className="space-y-4 py-2">
                                <div>
                                    <label className="form-label mb-1 block">Creation Timestamp</label>
                                    <div className="text-sm">{new Date(doc.created_at).toLocaleString()}</div>
                                </div>
                                {doc.grace_period_active && (
                                    <div className="p-3 bg-[var(--color-info)] bg-opacity-10 border border-[var(--color-info)] border-opacity-20 rounded">
                                        <label className="form-label" style={{ color: 'var(--color-info)' }}>Grace Period Active</label>
                                        <div className="text-sm font-semibold">Ends: {new Date(doc.grace_period_end!).toLocaleDateString()}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {doc.status === 'active' && (
                            <div className="card" style={{ borderColor: 'var(--color-danger-bg)', background: 'rgba(239, 68, 68, 0.02)' }}>
                                <div className="card-header"><h3 className="card-title" style={{ color: 'var(--color-danger)' }}>Security Management</h3></div>
                                <p className="text-xs text-[var(--color-text-muted)] mb-4">Revoking this document will permanently invalidate its fingerprint across all verification portals.</p>
                                <button
                                    className="btn btn-danger w-full"
                                    onClick={handleRevoke}
                                    disabled={revoking}
                                >
                                    {revoking ? 'Processing...' : 'Revoke Document'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Institutional Print/PDF Report - Optimized for Single A4 Page */}
            <div className="print-report" ref={printRef}>
                <style>{`
                    /* Institutional Print Styles - Single Page Optimized */
                    .print-report { 
                        position: absolute;
                        top: -9999px;
                        left: -9999px;
                        width: 210mm; /* Force A4 width for html2canvas */
                        font-family: 'Inter, SF Pro Display, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
                    }

                    @media print {
                        @page { 
                            size: A4 portrait; 
                            margin: 8mm;
                            size-adjust: 100%;
                        }
                        
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        body { 
                            background: #ffffff !important; 
                            margin: 0; 
                            padding: 0;
                            font-size: 9pt;
                            line-height: 1.3;
                        }
                        
                        .no-print { display: none !important; }
                        .print-report {
                            position: relative !important;
                            top: 0 !important;
                            left: 0 !important;
                            display: block !important;
                            width: 100%; 
                            max-width: 210mm;
                            padding: 0;
                            margin: 0 auto;
                            box-sizing: border-box;
                            page-break-after: avoid;
                            page-break-inside: avoid;
                            font-size: 9pt;
                            color: #111827;
                            background: #ffffff;
                            box-shadow: none;
                        }

                        /* HEADER - Executive Branding */
                        .report-header {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            padding: 12pt 0 10pt 0;
                            margin-bottom: 12pt;
                            border-bottom: 3pt solid #1f2937;
                            page-break-inside: avoid;
                        }
                        .report-brand { 
                            display: flex; 
                            gap: 8pt; 
                            align-items: center; 
                        }
                        .report-logo {
                            width: 36pt; 
                            height: 36pt;
                            background: linear-gradient(135deg, #1e293b 0%, #111827 100%);
                            color: #ffffff;
                            display: flex; 
                            align-items: center; 
                            justify-content: center;
                            font-weight: 900; 
                            font-size: 16pt;
                            border-radius: 6px;
                            font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
                            box-shadow: 0 2pt 4pt rgba(0,0,0,0.1);
                        }
                        .report-brand-name {
                            font-size: 11pt; 
                            font-weight: 800; 
                            color: #111827; 
                            margin: 0;
                            font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
                            letter-spacing: -0.02em;
                        }
                        .report-brand-tag { 
                            font-size: 7pt; 
                            color: #6b7280; 
                            text-transform: uppercase; 
                            letter-spacing: 0.08em; 
                            font-weight: 600;
                            margin-top: 1pt;
                        }
                        
                        .report-title-block { text-align: right; }
                        .report-title { 
                            font-size: 14pt; 
                            font-weight: 900; 
                            margin: 0 0 2pt 0; 
                            color: #111827;
                            letter-spacing: -0.02em;
                            font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
                        }
                        .report-serial { 
                            font-family: 'SF Mono', Consolas, monospace; 
                            font-size: 7pt; 
                            color: #6b7280; 
                            letter-spacing: 0.05em;
                        }

                        /* SECTIONS - Clean Institutional Layout */
                        .report-section { 
                            margin-bottom: 14pt; 
                            page-break-inside: avoid; 
                        }
                            font-size: 7.5pt;
                            font-weight: 800;
                            text-transform: uppercase;
                            letter-spacing: 0.12em;
                            color: #6b7280;
                            border-bottom: 1pt solid #e5e7eb;
                            padding-bottom: 3pt;
                            margin-bottom: 8pt;
                            font-family: 'SF Pro Display', Arial, sans-serif;
                        }
                        
                        /* Institutional Grid */
                        .report-grid { 
                            display: grid; 
                            grid-template-columns: repeat(3, 1fr); 
                            gap: 8pt 12pt; 
                        }
                        .report-field label { 
                            display: block; 
                            font-size: 7pt; 
                            font-weight: 700; 
                            color: #6b7280; 
                            text-transform: uppercase; 
                            letter-spacing: 0.08em;
                            margin-bottom: 2pt;
                        }
                        .report-field div { 
                            font-weight: 600; 
                            font-size: 9pt; 
                            color: #111827;
                            line-height: 1.2;
                        }

                        /* Recipient Block - Hero Treatment */
                        .report-recipient-block { 
                            margin-bottom: 12pt; 
                            text-align: center; 
                            page-break-inside: avoid; 
                        }
                        .recipient-name-large { 
                            font-size: 20pt; 
                            color: #111827;
                            font-weight: 700;
                            border-bottom: 2pt solid #d1d5db; 
                            padding-bottom: 4pt;
                            display: inline-block;
                            min-width: 70%;
                            letter-spacing: -0.02em;
                            font-family: 'SF Pro Display', Georgia, serif;
                            line-height: 1.1;
                        }

                        /* Professional Tables */
                        .report-table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            margin-top: 6pt; 
                            page-break-inside: avoid;
                            font-size: 8.5pt;
                        }
                        .report-table th { 
                            text-align: left; 
                            font-size: 7pt; 
                            text-transform: uppercase; 
                            color: #6b7280; 
                            padding: 6pt 8pt 6pt 0; 
                            border-bottom: 2pt solid #d1d5db;
                            font-weight: 700;
                            letter-spacing: 0.08em;
                        }
                        .report-table td { 
                            padding: 8pt 8pt 8pt 0; 
                            color: #111827; 
                            border-bottom: 1pt solid #e5e7eb;
                            font-weight: 500;
                            vertical-align: top;
                        }
                        .report-label-td { 
                            font-weight: 700; 
                            text-transform: capitalize; 
                            color: #374151; 
                            width: 35%;
                            font-size: 8pt;
                        }

                        /* Evidence Cards */
                        .report-evidence-card { 
                            background: #f9fafb; 
                            padding: 10pt; 
                            border: 1pt solid #e5e7eb; 
                            border-radius: 6px;
                            page-break-inside: avoid;
                        }
                        .report-mono-box { 
                            font-family: 'SF Mono', Consolas, 'Liberation Mono', monospace;
                            font-size: 7.5pt; 
                            font-weight: 600; 
                            color: #111827; 
                            background: #ffffff; 
                            padding: 4pt 6pt; 
                            border: 1pt solid #d1d5db; 
                            border-radius: 4px;
                            display: inline-block;
                            letter-spacing: -0.01em;
                        }
                        .report-mono-box.small { 
                            font-size: 6.5pt; 
                            line-height: 1.35; 
                            word-break: break-all; 
                            display: block; 
                            width: 100%; 
                            box-sizing: border-box;
                            font-weight: 500;
                            padding: 6pt;
                        }

                        /* Status Badges */
                        [class^="report-status-"] {
                            display: inline-block;
                            padding: 2pt 6pt;
                            font-size: 7pt;
                            font-weight: 800;
                            text-transform: uppercase;
                            border: 1pt solid currentColor;
                            border-radius: 4px;
                            letter-spacing: 0.08em;
                        }
                        .report-status-verified-&-active { color: #059669; border-color: #059669; }
                        .report-status-revoked { color: #dc2626; border-color: #dc2626; }
                        .report-status-expired { color: #6b7280; border-color: #6b7280; }
                        .report-status-expired-grace-period { color: #0ea5e9; border-color: #0ea5e9; }

                        /* FOOTER - Executive Signature */
                        .report-footer {
                            margin-top: 16pt;
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-end;
                            border-top: 1pt solid #d1d5db;
                            padding-top: 12pt;
                            page-break-inside: avoid;
                            font-size: 8pt;
                        }
                        .report-disclaimer { 
                            max-width: 55%; 
                            color: #6b7280; 
                            line-height: 1.4; 
                            text-align: justify;
                            font-size: 7.5pt;
                        }
                        .signature-block { 
                            text-align: center; 
                            margin-bottom: 4pt; 
                        }
                        .signature-line-dark { 
                            width: 140pt; 
                            border-top: 2pt solid #111827; 
                            margin: 0 auto 4pt auto; 
                        }
                        .signature-subtitle { 
                            font-size: 7pt; 
                            font-weight: 800; 
                            text-transform: uppercase; 
                            color: #6b7280;
                            letter-spacing: 0.08em;
                        }
                        .report-timestamp { 
                            font-size: 7pt; 
                            color: #9ca3af; 
                            text-align: right;
                            font-family: 'SF Mono', monospace;
                            letter-spacing: 0.03em;
                        }

                        /* Watermark */
                        .report-watermark {
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%) rotate(-45deg);
                            font-size: 24pt;
                            font-weight: 900;
                            color: rgba(55, 65, 81, 0.08);
                            letter-spacing: 0.3em;
                            text-transform: uppercase;
                            font-family: 'SF Pro Display', Arial, sans-serif;
                            pointer-events: none;
                            z-index: 1;
                        }

                        /* Ensure single page */
                        .print-report > * { position: relative; z-index: 2; }
                    }
                `}</style>

                <div className="report-watermark">REGISTRY VERIFIED</div>

                <header className="report-header">
                    <div className="report-brand">
                        <div className="report-logo">DF</div>
                        <div>
                            <div className="report-brand-name">DocFingerprint Registry</div>
                            <div className="report-brand-tag">Institutional Verification Authority</div>
                        </div>
                    </div>
                    <div className="report-title-block">
                        <h1 className="report-title">EXECUTIVE REGISTRY REPORT</h1>
                        <div className="report-serial">Serial: {doc.fingerprint_id}</div>
                    </div>
                </header>

                <section className="report-section">
                    <h2 className="section-title">Institutional Authority</h2>
                    <div className="report-grid">
                        <div className="report-field">
                            <label>Issuing Authority</label>
                            <div>{Array.isArray(doc.institution) ? doc.institution[0]?.legal_name : doc.institution?.legal_name || 'N/A'}</div>
                        </div>
                        <div className="report-field">
                            <label>Authority Code</label>
                            <div>{Array.isArray(doc.institution) ? doc.institution[0]?.institution_code : doc.institution?.institution_code || 'N/A'}</div>
                        </div>
                        <div className="report-field">
                            <label>Verification Status</label>
                            <div className={`report-status-${statusConfig.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>{statusConfig.label}</div>
                        </div>
                    </div>
                </section>

                <section className="report-section">
                    <h2 className="section-title">Principal Subject & Document</h2>
                    <div className="report-recipient-block">
                        <div className="report-field large">
                            <label>Principal Subject</label>
                            <div className="recipient-name-large">{doc.recipient_name}</div>
                        </div>
                    </div>
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th>Document Class</th>
                                <th>Registration Number</th>
                                <th>Date of Issue</th>
                                <th>Current Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="report-label-td">{doc.document_type.replace(/_/g, ' ').toUpperCase()}</td>
                                <td>{doc.document_number || 'N/A'}</td>
                                <td>{new Date(doc.issue_date).toLocaleDateString('en-US')}</td>
                                <td><strong>{doc.status.toUpperCase()}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                <section className="report-section">
                    <h2 className="section-title">Cryptographic Proof</h2>
                    <div className="report-evidence-card">
                        <div className="report-field">
                            <label>Immutable Registry ID</label>
                            <div className="report-mono-box">{doc.fingerprint_id}</div>
                        </div>
                        <div className="report-field" style={{ marginTop: '8pt' }}>
                            <label>SHA-256 Content Digest</label>
                            <div className="report-mono-box small">{doc.sha256_hash}</div>
                        </div>
                    </div>
                </section>

                {doc.document_metadata && Object.keys(doc.document_metadata).filter(k => !['height', 'gender', 'state'].includes(k)).length > 0 && (
                    <section className="report-section">
                        <h2 className="section-title">Supplemental Registry Data</h2>
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th>Attribute</th>
                                    <th>Registered Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(doc.document_metadata)
                                    .filter(([key]) => !['height', 'gender', 'state'].includes(key))
                                    .map(([key, value]) => (
                                        <tr key={key}>
                                            <td className="report-label-td">{key.replace(/_/g, ' ').toUpperCase()}</td>
                                            <td>{String(value)}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </section>
                )}

                <footer className="report-footer">
                    <div className="report-disclaimer">
                        This Executive Registry Report constitutes an official projection of the DocFingerprint Institutional Ledger.
                        The document's presence and integrity are cryptographically secured on mainnet.
                        Verify via digital original for real-time status.
                    </div>
                    <div className="report-signature-area">
                        <div className="signature-block">
                            <div className="signature-line-dark" />
                            <div className="signature-subtitle">Institutional Seal</div>
                        </div>
                        <div className="report-timestamp">
                            Generated: {new Date().toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}


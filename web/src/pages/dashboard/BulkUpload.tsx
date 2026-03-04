import { useState, type FormEvent } from 'react';
import { getApiKey } from '../../services/api';

interface BulkResult {
    total: number;
    successful: number;
    failed: number;
    documents: { fingerprint_id: string; recipient_name: string; status: string }[];
    errors: { index: number; recipient_name: string; error: string }[];
}

const CSV_TEMPLATE = `recipient_name,document_type,issue_date,document_number,expiry_date
John Doe,degree_certificate,2024-06-15,CERT-001,
Jane Smith,transcript,2024-07-01,TR-002,
Bob Johnson,professional_license,2024-08-10,LIC-003,2025-02-10`;

export default function BulkUpload() {
    const [jsonInput, setJsonInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<BulkResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    function csvToJson(csv: string): Record<string, string>[] {
        const lines = csv.trim().split('\n');
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map((h) => h.trim());
        return lines.slice(1).map((line) => {
            const values = line.split(',').map((v) => v.trim());
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => {
                if (values[i]) obj[h] = values[i];
            });
            return obj;
        });
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            let documents: Record<string, string>[];

            // Try JSON first, fall back to CSV parsing
            try {
                const parsed = JSON.parse(jsonInput);
                documents = Array.isArray(parsed) ? parsed : parsed.documents || [];
            } catch {
                // Treat as CSV
                documents = csvToJson(jsonInput);
            }

            if (documents.length === 0) {
                throw new Error('No records found. Paste JSON array or CSV data.');
            }

            if (documents.length > 500) {
                throw new Error('Maximum 500 documents per batch.');
            }

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tzulhmrmscedulpldvnk.supabase.co';
            const apiKey = getApiKey();
            const timestamp = new Date().toISOString();

            const res = await fetch(`${supabaseUrl}/functions/v1/bulk-upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                    'X-Timestamp': timestamp,
                    'X-Signature': btoa(timestamp),
                },
                body: JSON.stringify({ documents }),
            });

            const data = await res.json();

            if (!res.ok || data.status === 'error') {
                throw new Error(data.error?.message || 'Bulk upload failed');
            }

            setResult(data.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
            <div className="page-header">
                <h1 className="page-title">Bulk Upload</h1>
                <p className="page-subtitle">Register multiple documents at once (up to 500)</p>
            </div>

            {/* Input form */}
            <form onSubmit={handleSubmit}>
                <div className="card mb-6">
                    <div className="card-header flex items-center justify-between">
                        <h3 className="card-title">Document Data</h3>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ fontSize: 'var(--text-xs)' }}
                            onClick={() => setJsonInput(CSV_TEMPLATE)}
                        >
                            Load CSV Template
                        </button>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Paste CSV or JSON</label>
                        <textarea
                            className="textarea"
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            placeholder={`Paste CSV (with headers) or JSON array:\n\nrecipient_name,document_type,issue_date\nJohn Doe,degree_certificate,2024-01-15\n\nOR\n\n[{"recipient_name":"John Doe","document_type":"degree_certificate","issue_date":"2024-01-15"}]`}
                            rows={12}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}
                        />
                        <span className="form-hint">
                            Required columns: recipient_name, document_type, issue_date. Optional: document_number, expiry_date
                        </span>
                    </div>
                </div>

                {error && <div className="alert alert-error mb-6">{error}</div>}

                <div className="flex justify-between" style={{ justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !jsonInput.trim()}>
                        {loading ? (
                            <>
                                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                                    <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
                                    <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
                                </svg>
                                Upload Documents
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Results */}
            {result && (
                <div className="card mt-6 animate-fade-in">
                    <div className="card-header">
                        <h3 className="card-title">Upload Results</h3>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="stat-card">
                            <div className="stat-value">{result.total}</div>
                            <div className="stat-label">Total</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: 'var(--color-success)' }}>{result.successful}</div>
                            <div className="stat-label">Successful</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: result.failed > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                                {result.failed}
                            </div>
                            <div className="stat-label">Failed</div>
                        </div>
                    </div>

                    {/* Success list */}
                    {result.documents.length > 0 && (
                        <div className="table-container mb-4">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Fingerprint ID</th>
                                        <th>Recipient</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.documents.slice(0, 20).map((doc) => (
                                        <tr key={doc.fingerprint_id}>
                                            <td>
                                                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                                                    {doc.fingerprint_id}
                                                </code>
                                            </td>
                                            <td style={{ color: 'var(--color-text-primary)' }}>{doc.recipient_name}</td>
                                            <td><span className="badge badge-active">{doc.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {result.documents.length > 20 && (
                                <div className="pagination">
                                    <span className="pagination-info">
                                        Showing 20 of {result.documents.length} successful documents
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Errors */}
                    {result.errors.length > 0 && (
                        <div>
                            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-danger)', marginBottom: 'var(--space-2)' }}>
                                Errors ({result.errors.length})
                            </h4>
                            {result.errors.map((err, i) => (
                                <div
                                    key={i}
                                    className="alert alert-error"
                                    style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}
                                >
                                    Row {err.index}: {err.recipient_name} — {err.error}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

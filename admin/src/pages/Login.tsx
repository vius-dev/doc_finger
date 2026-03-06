import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { adminService } from '../api/adminService';
import './Login.css';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await adminService.signIn(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Authentication failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-glass-panel">
                <div className="login-header">
                    <div className="login-brand">
                        <Fingerprint size={48} className="brand-logo" />
                        <h1>DocFinger Admin</h1>
                    </div>
                    <p>Secure System Access Only</p>
                </div>

                {error && (
                    <div className="login-error">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="login-form-group">
                        <label htmlFor="email">Administrative Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="admin@docfinger.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="login-form-group">
                        <label htmlFor="password">Security Passphrase</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="login-submit-btn" disabled={isLoading}>
                        {isLoading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                <ShieldCheck size={20} />
                                <span>Authorise Entry</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <p>System Root Access • PBKDF2 Encrypted Session</p>
                </div>
            </div>
        </div>
    );
};

export default Login;

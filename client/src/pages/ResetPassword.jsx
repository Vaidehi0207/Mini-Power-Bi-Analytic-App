import React, { useState } from 'react';
import api from '../api/axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post(`/api/auth/reset-password/${token}`, { password });
            setSuccess(true);
        } catch (err) {
            if (!err.response) {
                setError('Unable to connect to server. Please check your network connection.');
            } else {
                setError(err.response?.data?.message || 'Failed to reset password. Token may be invalid or expired.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h1>Set New Password</h1>
                    <p>Enter your new account password below</p>
                </div>

                {success ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{
                            width: '56px', height: '56px', background: 'rgba(34, 197, 94, 0.1)',
                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px', color: '#22c55e'
                        }}>
                            <CheckCircle2 size={32} />
                        </div>
                        <h3>Password Updated!</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
                            Your password has been successfully reset. You can now log in with your new password.
                        </p>
                        <button className="login-button" onClick={() => navigate('/login')}>
                            Go to Sign In
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="login-form">
                        {error && <div className="error-message">{error}</div>}

                        <div className="input-group">
                            <label>New Password</label>
                            <div className="input-wrapper">
                                <Lock className="input-icon" size={20} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Min. 8 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Confirm New Password</label>
                            <div className="input-wrapper">
                                <Lock className="input-icon" size={20} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={8}
                                />
                            </div>
                        </div>

                        <button type="submit" className="login-button" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Reset Password'}
                        </button>
                    </form>
                )}

                <div className="login-footer" style={{ marginTop: '24px' }}>
                    <p>Remember your password? <Link to="/login">Sign In</Link></p>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;

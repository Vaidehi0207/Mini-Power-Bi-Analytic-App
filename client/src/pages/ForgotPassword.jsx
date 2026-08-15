import React, { useState } from 'react';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsSubmitting(true);

        try {
            const res = await api.post('/api/auth/forgot-password', { email });
            setMessage('Password reset request generated successfully!');
            if (res.data.resetToken) {
                setResetToken(res.data.resetToken);
            }
            setSubmitted(true);
        } catch (err) {
            if (!err.response) {
                setError('Unable to connect to server. Please check your network.');
            } else {
                setError(err.response?.data?.message || 'Failed to request password reset.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h1>Reset Password</h1>
                    <p>Enter your email to receive password reset instructions</p>
                </div>

                {submitted ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{
                            width: '56px', height: '56px', background: 'rgba(34, 197, 94, 0.1)',
                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px', color: '#22c55e'
                        }}>
                            <CheckCircle2 size={32} />
                        </div>
                        <h3 style={{ marginBottom: '8px' }}>Request Received</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
                            If an account exists for <strong>{email}</strong>, a password reset link has been created.
                        </p>

                        {resetToken && (
                            <div style={{
                                background: 'rgba(99, 102, 241, 0.08)',
                                border: '1px border var(--primary)',
                                borderRadius: '8px',
                                padding: '16px',
                                marginBottom: '24px',
                                textAlign: 'left'
                            }}>
                                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
                                    ⚡ Direct Reset Link (Demo / Local Mode):
                                </p>
                                <Link
                                    to={`/reset-password/${resetToken}`}
                                    style={{ color: 'var(--primary)', wordBreak: 'break-all', fontSize: '13px', fontWeight: 500 }}
                                >
                                    Click here to set a new password
                                </Link>
                            </div>
                        )}

                        <Link to="/login" className="login-button" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                            Return to Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="login-form">
                        {error && <div className="error-message">{error}</div>}
                        {message && <div className="success-message" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>{message}</div>}

                        <div className="input-group">
                            <label>Email Address</label>
                            <div className="input-wrapper">
                                <Mail className="input-icon" size={20} />
                                <input
                                    type="email"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className="login-button" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Send Reset Instructions'}
                        </button>
                    </form>
                )}

                <div className="login-footer" style={{ marginTop: '24px' }}>
                    <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '14px' }}>
                        <ArrowLeft size={16} /> Back to Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';

const Signup = () => {
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsSubmitting(true);
        try {
            await signup(username, email, password, fullName);
            setEmailSent(true);
        } catch (err) {
            const backendError = err.response?.data?.message;
            const detailedError = err.response?.data?.error;
            setError(detailedError ? `${backendError}: ${detailedError}` : (backendError || 'Failed to create account.'));
            setIsSubmitting(false);
        }
    };

    const handleResend = async () => {
        try {
            await api.post('/api/auth/resend-verification', { email });
            alert('Verification email resent! Check your console/inbox.');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to resend email');
        }
    };

    if (emailSent) {
        return (
            <div className="login-container">
                <div className="login-card" style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{
                        width: '60px', height: '60px', background: 'rgba(99, 102, 241, 0.1)',
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px', color: 'var(--primary)'
                    }}>
                        <Mail size={30} />
                    </div>
                    <h1>Check your email</h1>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
                        We've sent a verification link to <strong>{email}</strong>.
                        Please click the link to activate your account.
                    </p>
                    <button className="login-button" onClick={() => navigate('/login')}>
                        Return to Sign In
                    </button>
                    <p style={{ marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        Didn't receive the email? <span className="text-accent" style={{ cursor: 'pointer' }} onClick={handleResend}>Resend</span>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    {/* <div className="logo-icon">
                        <UserPlus size={32} />
                    </div> */}
                    <h1>Create Account</h1>
                    <p>Join Mini-Analyst to start your analytics journey</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="input-group">
                        <label>Full Name</label>
                        <div className="input-wrapper">
                            <User className="input-icon" size={20} />
                            <input
                                type="text"
                                placeholder="John Doe"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Username</label>
                        <div className="input-wrapper">
                            <User className="input-icon" size={20} />
                            <input
                                type="text"
                                placeholder="johndoe123"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                    </div>

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

                    <div className="input-group">
                        <label>Password</label>
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
                        <label>Confirm Password</label>
                        <div className="input-wrapper">
                            <Lock className="input-icon" size={20} />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Confirm your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </div>
                    </div>

                    <div className="terms-group" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
                        <input
                            type="checkbox"
                            id="terms"
                            required
                            style={{ width: 'auto', accentColor: 'var(--primary)' }}
                        />
                        <label htmlFor="terms" style={{ margin: 0, fontSize: '13px', display: 'inline' }}>
                            I agree to the <a href="#" style={{ color: 'var(--primary)' }}>Terms of Service</a> and <a href="#" style={{ color: 'var(--primary)' }}>Privacy Policy</a>
                        </label>
                    </div>

                    <button type="submit" className="login-button" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Create Account'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Already have an account? <Link to="/login">Sign In</Link></p>
                </div>
            </div>
        </div>
    );
};

export default Signup;

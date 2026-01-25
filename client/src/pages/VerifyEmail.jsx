import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext'; // Import context to access set user if needed? 
// Actually, I can't access user state setter directly from here easily without exposing it.
// Instead, I'll essentially replicate the login success logic here: set Storage and force reload or better, use a context method if available.

const VerifyEmail = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('Verifying your email...');
    const hasVerified = useRef(false);

    useEffect(() => {
        const verify = async () => {
            if (hasVerified.current) return;
            hasVerified.current = true;

            try {
                const res = await api.get(`/auth/verify-email/${token}`);
                const { token: jwtToken, user } = res.data;

                // Login the user
                localStorage.setItem('token', jwtToken);
                localStorage.setItem('user', JSON.stringify(user));

                setStatus('success');
                setMessage('Email verified successfully! Redirecting...');

                setTimeout(() => {
                    // Force window reload to ensure AuthContext picks up the new token
                    window.location.href = '/';
                }, 2000);

            } catch (err) {
                setStatus('error');
                setMessage(err.response?.data?.message || 'Verification failed. Link may be invalid or expired.');
            }
        };

        if (token) verify();
    }, [token]);

    return (
        <div className="login-container">
            <div className="login-card" style={{ textAlign: 'center', padding: '40px' }}>
                {status === 'verifying' && (
                    <>
                        <div className="animate-spin" style={{ margin: '0 auto 20px', width: '30px', height: '30px', border: '3px solid #f3f3f3', borderTop: '3px solid var(--primary)', borderRadius: '50%' }}></div>
                        <h2>Verifying...</h2>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div style={{ color: '#10b981', fontSize: '48px', marginBottom: '16px' }}>✓</div>
                        <h2>Verified!</h2>
                        <p>{message}</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div style={{ color: '#ef4444', fontSize: '48px', marginBottom: '16px' }}>✕</div>
                        <h2>Verification Failed</h2>
                        <p>{message}</p>
                        <button className="login-button mt-4" onClick={() => navigate('/login')}>
                            Back to Login
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;

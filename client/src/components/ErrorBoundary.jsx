import React from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="pbi-premium-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', height: '100vh', background: '#f3f2f1', color: '#252423' }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxWidth: '600px', width: '90%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem', color: '#dc2626' }}>
                            <AlertTriangle size={32} />
                            <h2 style={{ margin: 0 }}>Something went wrong</h2>
                        </div>
                        <p style={{ marginBottom: '1rem', color: '#605e5c' }}>The dashboard encountered an unexpected error.</p>

                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', overflow: 'auto', maxHeight: '200px', border: '1px solid #e2e8f0' }}>
                            <code style={{ fontFamily: 'monospace', fontSize: '12px', color: '#ef4444' }}>
                                {this.state.error && this.state.error.toString()}
                            </code>
                            <br />
                            <code style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                                {this.state.errorInfo && this.state.errorInfo.componentStack.slice(0, 300)}...
                            </code>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => window.location.reload()}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#252423', color: 'white', border: 'none', borderRadius: '99px', cursor: 'pointer', fontWeight: 600 }}
                            >
                                <RefreshCw size={16} /> Reload Page
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'white', color: '#252423', border: '1px solid #d1d1d1', borderRadius: '99px', cursor: 'pointer', fontWeight: 600 }}
                            >
                                <Home size={16} /> Return Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

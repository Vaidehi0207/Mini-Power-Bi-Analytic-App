import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
    Zap, Shield, PieChart, Layers, ArrowRight, CheckCircle,
    Users, Target, BarChart3, Moon, Sun, Database, Menu, X
} from 'lucide-react';

const LandingPage = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const handleAction = () => {
        if (user) navigate('/dashboard');
        else navigate('/login');
    };

    return (
        <div className={`landing-container ${isDarkMode ? 'dark' : 'light'}`}>
            {/* Navigation Header */}
            <nav className="landing-nav">
                <div className="nav-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    {/* <Database size={24} className="logo-icon" /> */}
                    <span>MiniBI</span>
                </div>

                <div className={`nav-links ${isMenuOpen ? 'mobile-open' : ''}`}>
                    <a href="#features">Features</a>
                    <a onClick={() => navigate('/about')} style={{ cursor: 'pointer' }}>About Us</a>
                    <a href="#success">Success</a>
                    <button className="theme-toggle" onClick={toggleTheme}>
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    {user ? (
                        <>
                            <button className="nav-btn secondary" onClick={() => navigate('/dashboard')}>Dashboard</button>
                            <button className="nav-btn primary" onClick={() => { logout(); navigate('/'); }}>Logout</button>
                        </>
                    ) : (
                        <>
                            <button className="nav-btn secondary" onClick={() => navigate('/login')}>Sign In</button>
                            <button className="nav-btn primary" onClick={() => navigate('/signup')}>Join Now</button>
                        </>
                    )}
                </div>

                <div className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero">
                <div className="hero-badge">
                    <Zap size={14} /> <span>The new era of analytics is here</span>
                </div>
                <h1 className="hero-title">
                    Transform <br />
                    <span className="gradient-text">Data into Decisions.</span>
                </h1>
                <p className="hero-subtitle">
                    Everything you need to dominate. <br />
                    The ultimate tech stack for data engineering and visualization.
                </p>
                <div className="hero-actions">
                    <button className="cta-btn primary" onClick={handleAction}>
                        Get your visualizations <ArrowRight size={18} />
                    </button>
                    {/* <button className="cta-btn secondary">Explore Network <ArrowRight size={18} /> </button> */}
                </div>
            </section>

            {/* Middle Section: Trusted by Digital Elite */}
            <section className="section-padding bg-alt text-center">
                <div className="container">
                    <h2 className="section-title-large">
                        Trusted by the <br />
                        <span className="text-accent">Digital Elite.</span>
                    </h2>
                    <p className="section-subtitle-large">Real results from companies scaling at light speed.</p>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button className="cta-btn outline mt-4" onClick={() => document.getElementById('success').scrollIntoView({ behavior: 'smooth' })}>
                            See Success Stories <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="section-padding">
                <div className="section-header">
                    <h2>Everything you need <br /><span className="text-accent">to dominate.</span></h2>
                    <p>The elite platform where high-performance data meet top-tier engineering.</p>
                </div>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="icon-box blue"><Target size={24} /></div>
                        <h3>Smart Matching</h3>
                        <p>AI-powered algorithm matches schemas with the perfect cleaning tools based on your data distribution.</p>
                    </div>
                    <div className="feature-card">
                        <div className="icon-box green"><Shield size={24} /></div>
                        <h3>Secure Processing</h3>
                        <p>End-to-end encryption ensures secure transitions with Alteryx-powered security and dispute resolution.</p>
                    </div>
                    <div className="feature-card">
                        <div className="icon-box purple"><PieChart size={24} /></div>
                        <h3>Real-time Analytics</h3>
                        <p>Track dataset health with comprehensive Power BI dashboards and ROI measurement tools.</p>
                    </div>
                    <div className="feature-card">
                        <div className="icon-box orange"><Layers size={24} /></div>
                        <h3>Streamlined Workflow</h3>
                        <p>From upload to final insights, manage entire data campaigns in one unified platform.</p>
                    </div>
                </div>
            </section>

            {/* Success Section */}
            <section id="success" className="section-padding">
                <div className="success-content">
                    <div className="success-text">
                        <h2>Client Success <br /><span className="text-accent">Stories.</span></h2>
                        <p>Hear from the leaders who chose Anti-Gravity for their mission-critical data.</p>
                    </div>
                    <div className="testimonials">
                        <div className="testimonial-card">
                            <div className="stars">★★★★★</div>
                            <p>"Anti-Gravity has transformed how we approach data cleaning. The quality of insights is unmatched."</p>
                            <div className="author">
                                <div className="avatar">P</div>
                                <div>
                                    <strong>Priya Sharma</strong>
                                    <span>Marketing Director @ TechVeda</span>
                                </div>
                            </div>
                        </div>
                        <div className="testimonial-card">
                            <div className="stars">★★★★★</div>
                            <p>"As a data analyst, Anti-Gravity provides me with high-quality profiling. The platform is transparent and professional."</p>
                            <div className="author">
                                <div className="avatar">A</div>
                                <div>
                                    <strong>Arjun Patel</strong>
                                    <span>Data Scientist @ GlobalData</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-content">
                    <div className="footer-brand">
                        <div className="nav-logo">
                            {/* <Database size={24} className="logo-icon" /> */}
                            <span>MiniBI</span>
                        </div>
                        <p>High-fidelity data engineering for the modern enterprise.</p>
                    </div>
                    <div className="footer-grid">
                        <div className="footer-col">
                            <h4>Platform</h4>
                            <a href="#features">Features</a>
                            <a href="#process">Workflows</a>
                            <a href="#">Security</a>
                        </div>
                        <div className="footer-col">
                            <h4>Company</h4>
                            <a onClick={() => navigate('/about')} style={{ cursor: 'pointer' }}>About Us</a>
                            <a href="#">Careers</a>
                            <a href="#">Contact</a>
                        </div>
                        <div className="footer-col">
                            <h4>Resources</h4>
                            <a href="#">Documentation</a>
                            <a href="#">API Reference</a>
                            <a href="#">Community</a>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>© 2026 MiniBI Engineering. All rights reserved. <span className="footer-dot">•</span> <a href="#">Privacy</a> <span className="footer-dot">•</span> <a href="#">Terms</a></p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;

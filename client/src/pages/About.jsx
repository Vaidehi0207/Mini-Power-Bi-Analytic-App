import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Rocket, Target, CheckCircle2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const About = () => {
    const { isDarkMode } = useTheme();
    const navigate = useNavigate();

    const handleNavClick = (sectionId) => {
        navigate('/', { state: { scrollTo: sectionId } });
        // Use a timeout to scroll if navigating to a new page
        setTimeout(() => {
            const el = document.getElementById(sectionId);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    return (
        <div className={`about-container ${isDarkMode ? 'dark' : 'light'}`}>
            <nav className="landing-nav" style={{ position: 'sticky', top: 0, zIndex: 1000, background: 'var(--bg-primary)' }}>
                <div className="nav-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    <span>MiniBI</span>
                </div>

                <div className="nav-links">
                    <button className="nav-btn ghost" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Home</button>
                    <button className="nav-btn ghost" onClick={() => handleNavClick('features')} style={{ cursor: 'pointer' }}>Features</button>
                    <button className="nav-btn ghost" onClick={() => handleNavClick('process')} style={{ cursor: 'pointer' }}>Process</button>
                    <button className="nav-btn ghost" onClick={() => handleNavClick('success')} style={{ cursor: 'pointer' }}>Success</button>
                </div>

                <div className="nav-actions">
                    <button className="nav-btn primary" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>Dashboard</button>
                </div>
            </nav>

            <main className="about-content">
                <section className="about-hero text-center section-padding"
                style={{ paddingBottom: "30px" }}
>
                    <div className="hero-badge mx-auto">
                        <Rocket size={14} /> <span>The Future of Analytics</span>
                    </div>
                    <h1>Welcome to <span className="text-accent">MiniBI</span></h1>
                    <p className="hero-subtitle mx-auto">
                        MiniBI is a modern data engineering and analytics platform designed to help users upload raw datasets,
                        clean and transform data automatically, and generate interactive insights and reports — all in one place.
                    </p>
                </section>

                <section className="about-mission section-padding"
                  style={{ paddingTop: "30px" }}
>
                    <div className="container">
                        <div className="mission-box mx-auto text-center" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                            <h2 className="mb-6">Our Mission</h2>
                            <p className="mb-4 text-lg">
                                We built MiniBI to simplify the real-world workflow of data teams, where raw files often contain
                                missing values, duplicates, inconsistent formats, and schema issues. With MiniBI, users can
                                process datasets confidently and visualize meaningful trends without manual effort.
                            </p>
                            <p className="mb-4 text-lg">
                                Our mission is to make data processing and analytics faster, smarter, and more accessible for everyone —
                                from students and analysts to teams working on real business datasets.
                            </p>
                            <p className="text-lg">
                                We aim to bridge the gap between raw data and decision-ready dashboards using a powerful combination
                                of full-stack development and data analytics tools.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="about-why section-padding bg-alt">
                    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h2 className="text-center">Why <span className="text-accent">MiniBI?</span></h2>
                        <p className="text-center section-subtitle-large">In real companies, data is rarely perfect. MiniBI is built for real-world challenges like:</p>

                        <div className="features-grid mt-8" style={{ justifyContent: 'center', width: '100%' }}>
                            {[
                                "Inconsistent column names",
                                "Missing values",
                                "Duplicate records",
                                "Corrupted or empty fields",
                                "Changing datasets with the same schema"
                            ].map((item, index) => (
                                <div key={index} className="feature-card small" style={{ margin: '0 10px 10px 0' }}>
                                    <div className="icon-box green"><CheckCircle2 size={20} /></div>
                                    <p>{item}</p>
                                </div>
                            ))}
                        </div>

                        <div className="cta-wrapper text-center mt-12" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <h3 style={{ marginBottom: "18px" }}>MiniBI ensures your data becomes clean, structured, and analytics-ready.</h3>
                            <button className="cta-btn primary mt-6" onClick={() => navigate('/signup')} style={{ cursor: 'pointer', marginTop: "10px"}}>
                                Start Your Journey <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="landing-footer">
                <div className="footer-content">
                    <div className="footer-brand">
                        <div className="nav-logo">
                            <span>MiniBI</span>
                        </div>
                        <p>High-fidelity data engineering for the modern enterprise.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default About;

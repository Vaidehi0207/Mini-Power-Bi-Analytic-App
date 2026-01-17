import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import FileUpload from '../components/FileUpload';
import PowerBIDashboard from '../components/PowerBIDashboard';
import DataReport from '../components/DataReport';
import api from '../api/axios';
import { Database, Clock, FileText, Info, Trash2, Sun, Moon, LogOut, LayoutDashboard, Share2 } from 'lucide-react';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const [files, setFiles] = useState([]);
    const [isPBIOpen, setIsPBIOpen] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [pbiFiles, setPbiFiles] = useState([]);
    const [selectedFilesForBlending, setSelectedFilesForBlending] = useState([]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 17) return "Good Afternoon";
        return "Good Evening";
    };

    const fetchFiles = async () => {
        try {
            const res = await api.get('/data/files');
            setFiles(res.data);
        } catch (err) {
            console.error('Failed to fetch files');
        }
    };

    const deleteFile = async (id) => {
        if (!window.confirm('Are you sure you want to remove this file entry?')) return;
        try {
            await api.delete(`/data/${id}`);
            setFiles(files.filter(f => f._id !== id));
            setSelectedFilesForBlending(prev => prev.filter(fid => fid !== id));
        } catch (err) {
            alert('Failed to delete file');
        }
    };

    const toggleFileSelection = (fileId) => {
        setSelectedFilesForBlending(prev =>
            prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
        );
    };

    const openPBI = (selectedFiles) => {
        setPbiFiles(selectedFiles);
        setIsPBIOpen(true);
        setIsReportOpen(false);
    };

    const openReport = (file) => {
        setSelectedFile(file);
        setIsReportOpen(true);
        setIsPBIOpen(false);
    };

    const handleBlend = () => {
        const selected = files.filter(f => selectedFilesForBlending.includes(f._id));
        openPBI(selected);
    };

    useEffect(() => {
        fetchFiles();
        const interval = setInterval(fetchFiles, 5000);
        return () => clearInterval(interval);
    }, []);

    if (isPBIOpen) {
        return <PowerBIDashboard files={pbiFiles} onClose={() => setIsPBIOpen(false)} />;
    }

    if (isReportOpen) {
        return <DataReport file={selectedFile} onClose={() => setIsReportOpen(false)} onExplorePBI={() => openPBI([selectedFile])} />;
    }

    return (
        <div className={`dashboard-root ${isDarkMode ? 'dark' : 'light'}`}>
            <header className="dashboard-header">
                <div className="header-brand">
                    <Database size={28} className="text-accent" />
                    <div className="brand-text">
                        <h2>ANTI-GRAVITY</h2>
                        <p>Intelligence Hub</p>
                    </div>
                </div>

                <div className="header-greeting">
                    <h1>{getGreeting()}, <span className="text-accent">{user?.username && user.username.trim() !== '' ? user.username.trim() : 'Vaidehi'}</span>.</h1>
                </div>

                <div className="header-actions">
                    <button className="icon-action-btn" onClick={toggleTheme} title="Toggle Theme">
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button className="logout-btn" onClick={logout}>
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </header>

            <main className="dashboard-content">
                <div className="dashboard-grid">
                    {/* Left Column: Upload */}
                    <section className="dashboard-card glass">
                        <div className="card-header">
                            <LayoutDashboard size={20} className="text-accent" />
                            <h3>Upload & Process</h3>
                        </div>
                        <FileUpload onUploadSuccess={fetchFiles} />
                    </section>

                    {/* Right Column: Activity */}
                    <section className="dashboard-card glass">
                        <div className="card-header flex-between">
                            <div className="flex-align">
                                <Clock size={20} className="text-accent" />
                                <h3>Recent Activity</h3>
                            </div>
                            {selectedFilesForBlending.length > 1 && (
                                <button className="blend-btn pulse" onClick={handleBlend}>
                                    <Share2 size={16} /> Blend {selectedFilesForBlending.length} Datasets
                                </button>
                            )}
                        </div>

                        <div className="activity-list">
                            {files.length === 0 ? (
                                <div className="empty-state">
                                    <FileText size={40} className="fade" />
                                    <p>No processed datasets yet.</p>
                                </div>
                            ) : (
                                files.map(file => (
                                    <div key={file._id} className={`activity-item ${selectedFilesForBlending.includes(file._id) ? 'selected' : ''}`}>
                                        <div className="item-main">
                                            <div className="checkbox-wrapper">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedFilesForBlending.includes(file._id)}
                                                    onChange={() => toggleFileSelection(file._id)}
                                                />
                                            </div>
                                            <FileText size={20} className="text-blue" />
                                            <div className="item-info">
                                                <strong>{file.originalName}</strong>
                                                <span>{new Date(file.uploadedAt).toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <div className="item-actions">
                                            <span className={`badge ${file.status}`}>{file.status}</span>
                                            {file.status === 'completed' && (
                                                <button className="action-tag report" onClick={() => openReport(file)}>
                                                    <Info size={14} /> Analytics
                                                </button>
                                            )}
                                            <button className="action-tag delete" onClick={() => deleteFile(file._id)}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;

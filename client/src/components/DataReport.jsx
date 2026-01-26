import React, { useState } from 'react';
import { X, CheckCircle2, ListFilter, Trash2, Rows, Layout, ShieldCheck, Zap, Globe, GitMerge, AlertTriangle, Database, Download, Share2, FileText, ArrowRight } from 'lucide-react';
import DataVisualization from './DataVisualization';
import WorkflowCanvas from './WorkflowCanvas';
import DataProfileViewer from './DataProfileViewer';
import PowerBIDashboard from './PowerBIDashboard';
import api from '../api/axios';

const DataPreviewTable = ({ data, title }) => {
    if (!data || data.length === 0) return null;
    const headers = Object.keys(data[0]);

    return (
        <div className="preview-container">
            <h4>{title}</h4>
            <div className="table-wrapper">
                <table className="preview-table">
                    <thead>
                        <tr>
                            {headers.map(h => <th key={h}>{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={i}>
                                {headers.map(h => <td key={h}>{row[h]}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const EngineComparison = () => (
    <div className="engine-comparison">
        <h4>Engine Capability Comparison</h4>
        <div className="comparison-table-wrapper">
            <table className="comparison-table">
                <thead>
                    <tr>
                        <th>Feature</th>
                        <th>Standard (Python)</th>
                        <th>Premium (Alteryx)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Automated Cleaning</td>
                        <td>✅ Yes</td>
                        <td>✅ Yes</td>
                    </tr>
                    <tr>
                        <td>Statistical Profiling</td>
                        <td>✅ Yes</td>
                        <td>✅ Yes</td>
                    </tr>
                    <tr>
                        <td>Feature Engineering</td>
                        <td>✅ Yes</td>
                        <td>✅ Yes</td>
                    </tr>
                    <tr>
                        <td>Fuzzy Data Matching</td>
                        <td>❌ No</td>
                        <td>✅ Advanced AI</td>
                    </tr>
                    <tr>
                        <td>Spatial Enrichment</td>
                        <td>❌ No</td>
                        <td>✅ Full (Lat/Long)</td>
                    </tr>
                    <tr>
                        <td>Multi-Source Blending</td>
                        <td>❌ No</td>
                        <td>✅ 3rd Party DBs</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
);

const DataReport = ({ file, onClose, onExplorePBI }) => {
    const [activeTab, setActiveTab] = useState('insights');
    if (!file || !file.auditLogs) return null;

    const audit = file.auditLogs;

    const handleDownload = async () => {
        try {
            const token = localStorage.getItem('token');
            let baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            if (!baseUrl.endsWith('/api')) {
                baseUrl = baseUrl.endsWith('/') ? `${baseUrl}api` : `${baseUrl}/api`;
            }
            const response = await fetch(`${baseUrl}/data/download/${file._id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Download failed' }));
                throw new Error(errorData.message || 'Download failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const baseName = file.originalName.substring(0, file.originalName.lastIndexOf('.')) || file.originalName;
            a.download = `cleaned_${baseName}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            alert("Cleaned file download started!");
        } catch (err) {
            console.error(err);
            alert(`Download Error: ${err.message}`);
        }
    };

    const handlePowerBI = () => {
        if (onExplorePBI) {
            onExplorePBI();
        }
    };

    return (
        <div className="modal-overlay">
            <div className="report-modal">
                <div className="report-header">
                    <h2>Data Engineering Audit: {file.originalName}</h2>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={onClose} className="close-btn"><X /></button>
                    </div>
                </div>

                <div className="workflow-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
                        onClick={() => setActiveTab('insights')}
                    >
                        Insights Summary
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'workflow' ? 'active' : ''}`}
                        onClick={() => setActiveTab('workflow')}
                    >
                        Alteryx Workflow View
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        Data Health & Profiling
                    </button>
                </div>

                {activeTab === 'workflow' ? (
                    <WorkflowCanvas file={file} />
                ) : activeTab === 'profile' ? (
                    <DataProfileViewer profile={audit.column_profile} />
                ) : (
                    <>
                        <div className="report-stats">
                            <div className="stat-card">
                                <Rows className="stat-icon" />
                                <span className="stat-label">Rows Processed</span>
                                <span className="stat-value">{audit.rows_before}</span>
                            </div>
                            <div className="stat-card">
                                <CheckCircle2 className="stat-icon green" />
                                <span className="stat-label">Rows Remaining</span>
                                <span className="stat-value">{audit.rows_after}</span>
                            </div>
                            <div className="stat-card">
                                <Trash2 className="stat-icon red" />
                                <span className="stat-label">Duplicates Removed</span>
                                <span className="stat-value">{audit.duplicates_removed}</span>
                            </div>
                            <div className="stat-card">
                                <ListFilter className="stat-icon yellow" />
                                <span className="stat-label">Empty Rows Removed</span>
                                <span className="stat-value">{audit.empty_rows_removed}</span>
                            </div>
                            <div className="stat-card quality-score-card">
                                <div className="quality-gauge">
                                    <svg viewBox="0 0 36 36" className="circular-chart">
                                        <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                        <path className="circle" strokeDasharray={`${audit.quality_score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                        <text x="18" y="20.35" className="percentage">{audit.quality_score}%</text>
                                    </svg>
                                </div>
                                <span className="stat-label">Data Quality Score</span>
                            </div>
                        </div>

                        <div className="report-details">
                            <div className="engine-info">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <Layout className="stat-icon" style={{ margin: 0 }} />
                                    <h3>Processing Engine: <span className="engine-tag" style={{ marginLeft: '8px' }}>{file.processingType}</span></h3>
                                </div>

                                <div className="insights-grid">
                                    {audit.outliers_found && Object.keys(audit.outliers_found).length > 0 && (
                                        <div className="insight-card alert">
                                            <div className="insight-header">
                                                <AlertTriangle size={18} />
                                                <h4>Outliers Detected</h4>
                                            </div>
                                            <div className="outlier-list">
                                                {Object.entries(audit.outliers_found).map(([col, count]) => (
                                                    <div key={col} className="outlier-item">
                                                        <span>{col}</span>
                                                        <strong>{count} flags</strong>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {audit.features_added && audit.features_added.length > 0 && (
                                        <div className="insight-card success">
                                            <div className="insight-header">
                                                <Zap size={18} />
                                                <h4>Feature Engineering</h4>
                                            </div>
                                            <div className="feature-tags">
                                                {audit.features_added.map(f => <span key={f} className="feature-tag">{f}</span>)}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {audit.renamed_columns && audit.renamed_columns.length > 0 && (
                                    <div className="column-fixes">
                                        <h4>Column Standardization</h4>
                                        <ul>
                                            {audit.renamed_columns.map((col, i) => (
                                                <li key={i}>{col}</li>
                                            ))}
                                        </ul>
                                        <p className="fix-note">Fixed columns that were empty, corrupt, or poorly named.</p>
                                    </div>
                                )}
                            </div>

                            <div className="previews-grid">
                                <DataPreviewTable data={audit.sample_before} title="Original Sample (First 5 Rows)" />
                                <DataPreviewTable data={audit.sample_after} title="Cleaned Sample (First 5 Rows)" />
                            </div>


                        </div> {/* Closing report-details here */}

                        <DataVisualization file={file} />

                        <EngineComparison />
                    </>
                )}

                <div className="action-bar-premium mt-8">
                    <div className="action-info">
                        <h4>Engineering Audit Complete</h4>
                        <p>Dataset has been cleaned, standardized, and profiled.</p>
                    </div>
                    <div className="action-group">
                        <button className="p-btn secondary" onClick={handleDownload}>
                            <Download size={16} /> Download CSV
                        </button>
                        <button className="p-btn primary" onClick={handlePowerBI}>
                            <Share2 size={16} /> Explore in Power BI <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataReport;

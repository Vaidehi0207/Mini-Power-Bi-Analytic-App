import React from 'react';
import { BarChart3, Activity, ShieldAlert, CheckCircle2 } from 'lucide-react';

const DataProfileViewer = ({ profile }) => {
    if (!profile) return null;

    return (
        <div className="data-profile-container">
            <div className="profile-grid">
                {Object.entries(profile).map(([col, stats]) => (
                    <div key={col} className="profile-card">
                        <div className="profile-header">
                            <span className="col-name">{col}</span>
                            <span className={`health-pill ${stats.health}`}>{stats.health}</span>
                        </div>

                        <div className="health-bar-container">
                            <div className={`health-bar-fill ${stats.health}`} style={{ width: `${100 - stats.null_pct}%` }}></div>
                        </div>

                        <div className="stats-row">
                            <div className="stat-item">
                                <span className="stat-label">Type</span>
                                <span className="stat-val">{stats.type}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Unique</span>
                                <span className="stat-val">{stats.unique_count}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Nulls</span>
                                <span className="stat-val">{stats.null_pct}%</span>
                            </div>
                        </div>

                        {stats.mean !== undefined && (
                            <div className="advanced-stats">
                                <div className="stat-mini">
                                    <span>Avg: <strong>{stats.mean.toFixed(2)}</strong></span>
                                </div>
                                <div className="stat-mini">
                                    <span>Range: <strong>{stats.min} - {stats.max}</strong></span>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DataProfileViewer;

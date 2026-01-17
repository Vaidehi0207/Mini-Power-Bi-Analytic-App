import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ScatterChart, Scatter, ZAxis, Legend, ComposedChart
} from 'recharts';
import {
    Layout, Filter, ChevronDown, Download, Maximize2, X, MoreHorizontal, FileText,
    Share2, Info, Map as MapIcon, GitBranch, Target, Layers, Home, BarChart3,
    Clock, Database, RefreshCw, Search, Calendar, MapPin, DollarSign, TrendingUp, Users
} from 'lucide-react';

const PB_COLORS = ['#252423', '#F2C811', '#BDC3C7', '#414042', '#3498db', '#e67e22', '#2ecc71', '#9b59b6'];

const PowerBIDashboard = ({ files = [], onClose }) => {
    // Ensure files is always an array
    const fileList = Array.isArray(files) ? files : [files];
    const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);

    const activeFile = fileList[selectedSourceIndex] || fileList[0];
    if (!activeFile) return null;

    const audit = activeFile.auditLogs;
    const profile = audit.column_profile || {};
    const [activePage, setActivePage] = useState('overview');
    const [selectedFilters, setSelectedFilters] = useState({});
    const [isFilterPaneOpen, setIsFilterPaneOpen] = useState(true);

    // 1. DYNAMIC VISUALIZATION ENGINE
    const numericCols = Object.entries(profile).filter(([_, info]) => info.type.includes('float') || info.type.includes('int')).map(([name]) => name);
    const catCols = Object.entries(profile).filter(([_, info]) => info.type === 'object' && info.unique_count < 25).map(([name]) => name);
    const dateCols = Object.entries(profile).filter(([name]) => name.toLowerCase().includes('year') || name.toLowerCase().includes('month') || name.toLowerCase().includes('date')).map(([name]) => name);

    // 2. INTERACTIVE FILTER LOGIC
    const filteredData = useMemo(() => {
        let data = audit.sample_after || [];
        Object.entries(selectedFilters).forEach(([col, val]) => {
            if (val) data = data.filter(item => String(item[col]) === val);
        });
        return data;
    }, [audit.sample_after, selectedFilters]);

    const toggleFilter = (col, val) => {
        setSelectedFilters(prev => ({
            ...prev,
            [col]: prev[col] === val ? null : val
        }));
    };

    // Sub-renderers for pages
    const renderOverview = () => (
        <div className="pbi-page-content">
            {/* KPI Grid - High Density */}
            <div className="pbi-premium-kpi-grid">
                <div className="pbi-kpi-card-modern">
                    <div className="kpi-icon-box blue"><Users size={20} /></div>
                    <div className="kpi-details">
                        <span className="kpi-label">Filtered Records</span>
                        <span className="kpi-value">{filteredData.length.toLocaleString()}</span>
                    </div>
                </div>
                <div className="pbi-kpi-card-modern">
                    <div className="kpi-icon-box blue"><DollarSign size={20} /></div>
                    <div className="kpi-details">
                        <span className="kpi-label">Total {numericCols[0] || 'Value'}</span>
                        <span className="kpi-value">
                            {numericCols[0]?.toLowerCase().match(/revenue|cost|price|fee|amount|usd|val/) ? '$' : ''}
                            {filteredData.reduce((acc, c) => acc + (c[numericCols[0]] || 0), 0).toLocaleString()}
                        </span>
                    </div>
                </div>
                <div className="pbi-kpi-card-modern">
                    <div className="kpi-icon-box blue"><TrendingUp size={20} /></div>
                    <div className="kpi-details">
                        <span className="kpi-label">Avg {numericCols[0] || 'Quality'}</span>
                        <span className="kpi-value">
                            {(filteredData.reduce((acc, c) => acc + (c[numericCols[0]] || 0), 0) / (filteredData.length || 1)).toFixed(2)}
                        </span>
                    </div>
                </div>
                <div className="pbi-kpi-card-modern">
                    <div className="kpi-icon-box blue"><Database size={20} /></div>
                    <div className="kpi-details">
                        <span className="kpi-label">Quality Score</span>
                        <span className="kpi-value">{audit.quality_score}%</span>
                    </div>
                </div>
            </div>

            {/* Main Visuals Area */}
            <div className="pbi-visuals-grid-modern">
                <div className="pbi-chart-card-modern span-2">
                    <div className="chart-header">
                        <div className="chart-title-group">
                            <h3>{numericCols[0] || 'Records'} by {catCols[0] || 'Category'}</h3>
                            <p className="chart-subtitle">{activeFile.originalName}</p>
                        </div>
                        <MoreHorizontal size={16} className="text-muted" />
                    </div>
                    <div className="chart-body-container">
                        <ResponsiveContainer width="100%" height={280}>
                            <ComposedChart data={filteredData.slice(0, 8)}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey={catCols[0]} fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} />
                                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--text-main)' }} />
                                <Bar dataKey={numericCols[0] || 'rows_after'} fill="var(--accent)" radius={[4, 4, 0, 0]} barSize={40} />
                                <Line type="monotone" dataKey={numericCols[0] || 'rows_after'} stroke="var(--text-main)" strokeWidth={3} dot={{ r: 4, fill: 'var(--text-main)' }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="pbi-chart-card-modern">
                    <div className="chart-header">
                        <h3>Distribution</h3>
                        <PieChart size={16} className="text-muted" />
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie
                                data={catCols[1] ? [...new Set(filteredData.map(d => d[catCols[1]]))].map(v => ({ name: v, value: filteredData.filter(d => d[catCols[1]] === v).length })) : [{ name: 'Data', value: 100 }]}
                                cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                            >
                                {PB_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                            </Pie>
                            <Tooltip />
                            <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="pbi-chart-card-modern">
                    <div className="chart-header">
                        <h3>Top Insights</h3>
                        <Maximize2 size={16} className="text-muted" />
                    </div>
                    <div className="chart-body-container">
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart layout="vertical" data={filteredData.slice(0, 5)}>
                                <XAxis type="number" hide />
                                <YAxis dataKey={catCols[1] || catCols[0]} type="category" fontSize={10} axisLine={false} tickLine={false} width={80} tick={{ fill: 'var(--text-muted)' }} />
                                <Tooltip />
                                <Bar dataKey={numericCols[0] || 'rows_after'} fill="var(--bg-primary)" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderTimeAnalysis = () => (
        <div className="pbi-page-content">
            <div className="pbi-chart-card-modern span-full">
                <div className="chart-header">
                    <div className="chart-title-group">
                        <h3>Timeline Analysis</h3>
                        <p className="chart-subtitle">Trend for {activeFile.originalName}</p>
                    </div>
                </div>
                <div className="chart-body-container" style={{ height: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredData}>
                            <defs>
                                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis dataKey={dateCols[0]} fontSize={11} tick={{ fill: 'var(--text-muted)' }} />
                            <YAxis fontSize={11} tick={{ fill: 'var(--text-muted)' }} />
                            <Tooltip />
                            <Area type="monotone" dataKey={numericCols[0] || 'rows_after'} stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorTrend)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );

    const renderDetails = () => (
        <div className="pbi-page-content">
            <div className="pbi-table-card glass">
                <div className="table-controls">
                    <h3>Dataset: {activeFile.originalName}</h3>
                    <div className="table-search">
                        <Search size={14} />
                        <input type="text" placeholder="Filter records..." className="transparent-input" />
                    </div>
                </div>
                <div className="table-responsive-container">
                    <table className="pbi-modern-table">
                        <thead>
                            <tr>
                                {Object.keys(filteredData[0] || {}).map(k => <th key={k}>{k.replace('_', ' ')}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((row, i) => (
                                <tr key={i}>
                                    {Object.values(row).map((v, j) => <td key={j}>{typeof v === 'number' ? v.toLocaleString() : String(v)}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    return (
        <div className="pbi-premium-container">
            {/* Sidebar Navigation - Glassmorphic */}
            <div className="pbi-modern-sidebar glass">
                <div className="sidebar-brand">
                    <div className="brand-logo"><Database size={24} /></div>
                </div>
                <nav className="sidebar-nav">
                    <button className={`nav-item ${activePage === 'overview' ? 'active' : ''}`} onClick={() => setActivePage('overview')}>
                        <Home size={20} />
                        <span>Overview</span>
                    </button>
                    <button className={`nav-item ${activePage === 'time' ? 'active' : ''}`} onClick={() => setActivePage('time')}>
                        <BarChart3 size={20} />
                        <span>Insights</span>
                    </button>
                    <button className={`nav-item ${activePage === 'details' ? 'active' : ''}`} onClick={() => setActivePage('details')}>
                        <Layers size={20} />
                        <span>Data</span>
                    </button>
                </nav>
                <div className="sidebar-footer">
                    <button className="nav-item exit" onClick={onClose}>
                        <X size={20} />
                        <span>Exit Hub</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="pbi-main-viewport">
                {/* Premium Header */}
                <header className="pbi-modern-header">
                    <div className="header-left">
                        <div className="flex-align">
                            <button className="back-link-btn" onClick={onClose}><Home size={16} /> Back</button>
                            <div className="header-title-divider"></div>
                            <div>
                                <h1>Premium Analytics</h1>
                                <p className="breadcrumb">Hub / {activeFile.originalName} / {activePage.toUpperCase()}</p>
                            </div>
                        </div>
                    </div>
                    <div className="header-right">
                        <div className="header-tools">
                            {fileList.length > 1 && (
                                <select
                                    className="source-select-premium"
                                    value={selectedSourceIndex}
                                    onChange={(e) => setSelectedSourceIndex(Number(e.target.value))}
                                >
                                    {fileList.map((f, i) => (
                                        <option key={f._id} value={i}>{f.originalName}</option>
                                    ))}
                                </select>
                            )}
                            <button className="tool-btn"><Share2 size={16} /></button>
                            <button className="tool-btn highlight" onClick={() => setIsFilterPaneOpen(!isFilterPaneOpen)}>
                                <Filter size={16} /> <span>Filters</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Slicer / Action Bar */}
                <div className="pbi-slicer-bar-premium glass">
                    <div className="slicer-group">
                        <Calendar size={14} className="text-accent" />
                        <span className="slicer-label">Time Period:</span>
                        <select className="slicer-select">
                            <option>All History</option>
                            <option>YTD Analysis</option>
                            <option>Last Quarter</option>
                        </select>
                    </div>
                    <div className="slicer-group">
                        <RefreshCw size={14} className="text-accent" />
                        <span className="slicer-value">Verified: {activeFile.status}</span>
                    </div>
                </div>

                {/* Page Content */}
                <main className="pbi-main-scrollable">
                    {activePage === 'overview' && renderOverview()}
                    {activePage === 'time' && renderTimeAnalysis()}
                    {activePage === 'details' && renderDetails()}
                </main>
            </div>

            {/* Right Filter Pane */}
            {isFilterPaneOpen && (
                <aside className="pbi-premium-filter-pane glass">
                    <div className="pane-header">
                        <h2>Slicers</h2>
                        <ChevronDown size={16} />
                    </div>

                    <div className="pane-section">
                        {catCols.map(col => (
                            <div key={col} className="filter-card">
                                <div className="filter-card-header">
                                    <span className="field-name">{col}</span>
                                    <ChevronDown size={12} />
                                </div>
                                <div className="filter-options-list">
                                    {[...new Set(audit.sample_after.map(d => d[col]))].slice(0, 8).map(val => (
                                        <label key={val} className="filter-option">
                                            <input
                                                type="checkbox"
                                                checked={selectedFilters[col] === val}
                                                onChange={() => toggleFilter(col, val)}
                                            />
                                            <span>{val}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pane-section flush">
                        <span className="section-title">Fields in View</span>
                        <div className="fields-tree">
                            {Object.keys(profile).map(f => (
                                <div key={f} className="field-tree-item">
                                    <div className={`type-dot ${numericCols.includes(f) ? 'numeric' : 'cat'}`}></div>
                                    <span>{f}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            )}
        </div>
    );
};

export default PowerBIDashboard;

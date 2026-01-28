import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ScatterChart, Scatter, ZAxis, Legend, ComposedChart
} from 'recharts';
import {
    Layout, Filter, ChevronDown, Download, Maximize2, X, MoreHorizontal, FileText,
    Share2, Info, Map as MapIcon, GitBranch, Target, Layers, Home, BarChart3,
    Clock, Database, RefreshCw, Search, Calendar, MapPin, DollarSign, TrendingUp, Users, ChevronRight
} from 'lucide-react';

const PB_COLORS = ['#252423', '#F2C811', '#BDC3C7', '#414042', '#3498db', '#e67e22', '#2ecc71', '#9b59b6'];

const PowerBIDashboard = ({ files = [], onClose }) => {
    // Ensure files is always an array
    const fileList = Array.isArray(files) ? files : [files];
    const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);

    const activeFile = fileList[selectedSourceIndex] || fileList[0];

    // FALLBACK UI: Prevent White Screen if no file is found
    if (!activeFile) {
        return (
            <div className="pbi-premium-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <h2 style={{ marginBottom: '1rem' }}>No Dataset Selected</h2>
                <button className="back-link-btn" onClick={onClose}><Home size={16} /> Return to Hub</button>
            </div>
        );
    }

    const audit = activeFile.auditLogs || {};
    const profile = audit.column_profile || {};
    const [activePage, setActivePage] = useState('overview');
    const [selectedFilters, setSelectedFilters] = useState({}); // Stores { column: [val1, val2] }
    const [isFilterPaneOpen, setIsFilterPaneOpen] = useState(true);
    const [collapsedSlicers, setCollapsedSlicers] = useState({});

    const toggleSlicer = (col) => {
        setCollapsedSlicers(prev => ({
            ...prev,
            [col]: !prev[col]
        }));
    };

    // 1. DYNAMIC VISUALIZATION ENGINE
    const numericCols = Object.entries(profile)
        .filter(([_, info]) => info.type.includes('float') || info.type.includes('int') || info.type.includes('number'))
        .map(([name]) => name);

    // Smart Category: All categorical candidates for the slicer pane
    const catCols = useMemo(() => {
        return Object.entries(profile)
            .filter(([_, info]) =>
                info.type === 'object' ||
                info.type === 'string' ||
                info.type.includes('string') ||
                info.type === 'category' ||
                info.type === 'bool'
            )
            .sort((a, b) => a[1].unique_count - b[1].unique_count)
            .map(([name]) => name);
    }, [profile]);

    // Smart Dates: specific names OR datetime type detection
    const dateCols = Object.entries(profile)
        .filter(([name, info]) =>
            name.toLowerCase().match(/date|time|year|month|day|period|at/) ||
            info.type.includes('datetime') || info.type.includes('timestamp')
        )
        .map(([name]) => name);

    // Helper: Safely parse numbers from dirty strings (currency, commas)
    const parseSafeNumber = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        const str = String(val);
        // Remove currency symbols, commas, spaces - keep digits, minus, dot
        const clean = str.replace(/[^0-9.-]/g, '');
        return parseFloat(clean) || 0;
    };

    // Smart Metric Selection: If no numeric cols or sum is 0, use Record Count
    const bestNumericCol = useMemo(() => {
        // Filter out ID columns from being the primary metric
        const candidates = numericCols.filter(n => !n.toLowerCase().match(/(_id|id|code|index|^no$|^nr$)/));
        const data = audit.sample_after || []; // SAFEGUARD

        for (const col of candidates) {
            const sum = data.reduce((acc, c) => acc + parseSafeNumber(c[col]), 0);
            if (sum > 0) return col;
        }
        return null; // Fallback to record_count
    }, [numericCols, audit.sample_after]);

    const activeMetric = bestNumericCol || 'record_count';
    const isCountMetric = activeMetric === 'record_count';


    // 2. INTERACTIVE FILTER LOGIC (Multi-select)
    const filteredData = useMemo(() => {
        let data = audit.sample_after || [];
        if (!Array.isArray(data)) return [];

        Object.entries(selectedFilters).forEach(([col, vals]) => {
            if (vals && Array.isArray(vals) && vals.length > 0) {
                data = data.filter(item => {
                    const itemVal = item[col];
                    const normalizedItemVal = (itemVal === null || itemVal === undefined) ? "null" : String(itemVal);
                    return vals.includes(normalizedItemVal);
                });
            }
        });
        return data;
    }, [audit.sample_after, selectedFilters]);

    const isFiltered = useMemo(() =>
        Object.values(selectedFilters).some(vals => vals && Array.isArray(vals) && vals.length > 0)
        , [selectedFilters]);

    const clearAllFilters = () => setSelectedFilters({});

    const toggleFilter = (col, val) => {
        const stringVal = (val === null || val === undefined) ? "null" : String(val);
        setSelectedFilters(prev => {
            const currentVals = prev[col] || [];
            if (currentVals.includes(stringVal)) {
                const nextVals = currentVals.filter(v => v !== stringVal);
                const newFilters = { ...prev };
                if (nextVals.length > 0) {
                    newFilters[col] = nextVals;
                } else {
                    delete newFilters[col];
                }
                return newFilters;
            } else {
                return { ...prev, [col]: [...currentVals, stringVal] };
            }
        });
    };

    // Helper for Top/Unique KPIs in Count Mode
    const primaryCat = catCols[0] || 'Category';
    const uniqueCats = useMemo(() => new Set(filteredData.map(d => d[primaryCat])).size, [filteredData, primaryCat]);
    const topCat = useMemo(() => {
        if (filteredData.length === 0) return 'N/A';
        const counts = filteredData.reduce((acc, d) => {
            const key = d[primaryCat] || 'Unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    }, [filteredData, primaryCat]);

    // Sub-renderers for pages
    const renderOverview = () => {
        const totalRows = isFiltered ? filteredData.length : (audit.rows_after || audit.sample_after?.length || 0);
        const displaySum = isFiltered
            ? filteredData.reduce((acc, c) => acc + parseSafeNumber(c[activeMetric]), 0)
            : (profile[activeMetric]?.sum || filteredData.reduce((acc, c) => acc + parseSafeNumber(c[activeMetric]), 0));

        const displayAvg = isFiltered
            ? (displaySum / (filteredData.length || 1))
            : (profile[activeMetric]?.mean || (displaySum / (totalRows || 1)));

        return (
            <div className="pbi-page-content">
                {/* KPI Grid - High Density */}
                <div className="pbi-premium-kpi-grid">
                    <div className="pbi-kpi-card-modern" title="Total records in view">
                        <div className="kpi-icon-box blue"><Users size={20} /></div>
                        <div className="kpi-details">
                            <span className="kpi-label">{isFiltered ? 'Filtered' : 'Total'} Records</span>
                            <span className="kpi-value">{totalRows.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="pbi-kpi-card-modern" title={isCountMetric ? `Unique ${primaryCat} values` : `Sum of ${activeMetric}`}>
                        <div className="kpi-icon-box blue">{isCountMetric ? <Layers size={20} /> : <DollarSign size={20} />}</div>
                        <div className="kpi-details">
                            <span className="kpi-label">{isCountMetric ? `Unique ${primaryCat}` : `Total ${activeMetric}`}</span>
                            <span className="kpi-value" style={{ fontSize: displaySum > 1000000 ? '20px' : '24px' }}>
                                {isCountMetric
                                    ? (isFiltered ? uniqueCats : (profile[primaryCat]?.unique_count || uniqueCats)).toLocaleString()
                                    : <>{activeMetric.toLowerCase().match(/revenue|cost|price|fee|amount|usd|val/) ? '$' : ''}{displaySum.toLocaleString()}</>
                                }
                            </span>
                        </div>
                    </div>

                    <div className="pbi-kpi-card-modern" title={isCountMetric ? `Top ${primaryCat}` : `Average ${activeMetric}`}>
                        <div className="kpi-icon-box blue">{isCountMetric ? <Target size={20} /> : <TrendingUp size={20} />}</div>
                        <div className="kpi-details">
                            <span className="kpi-label">{isCountMetric ? `Top ${primaryCat}` : `Avg ${activeMetric}`}</span>
                            <span className="kpi-value" style={isCountMetric ? { fontSize: '18px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' } : {}}>
                                {isCountMetric
                                    ? (topCat ? topCat[0] : 'N/A')
                                    : displayAvg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                                }
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
                                <h3>{isCountMetric ? 'Record Count' : activeMetric} by {catCols[0] || 'Category'}</h3>
                                <p className="chart-subtitle">{activeFile.originalName}</p>
                            </div>
                            <MoreHorizontal size={16} className="text-muted" />
                        </div>
                        <div className="chart-body-container">
                            <ResponsiveContainer width="100%" height={280}>
                                <ComposedChart data={
                                    // Prepare data for chart: Group by Category and Sum Metric (or Count)
                                    Object.entries(filteredData.reduce((acc, row) => {
                                        const key = row[catCols[0]] || 'Unknown';
                                        const val = isCountMetric ? 1 : parseSafeNumber(row[activeMetric]);
                                        acc[key] = (acc[key] || 0) + val;
                                        return acc;
                                    }, {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8)
                                }>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} />
                                    <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} />
                                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--text-main)' }} />
                                    <Bar dataKey="value" name={isCountMetric ? 'Count' : activeMetric} fill="var(--accent)" radius={[4, 4, 0, 0]} barSize={40} />
                                    <Line type="monotone" dataKey="value" stroke="var(--text-main)" strokeWidth={3} dot={{ r: 4, fill: 'var(--text-main)' }} />
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
                                    data={catCols[1] || catCols[0] ? Object.entries(filteredData.reduce((acc, row) => {
                                        const key = row[catCols[1] || catCols[0]] || 'Unknown';
                                        acc[key] = (acc[key] || 0) + 1; // Count distribution always works best for pie
                                        return acc;
                                    }, {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value) : [{ name: 'Data', value: 100 }]}
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
                            <h3>Top {isCountMetric ? 'Categories' : 'Insights'}</h3>
                            <Maximize2 size={16} className="text-muted" />
                        </div>
                        <div className="chart-body-container">
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart layout="vertical" data={
                                    // Prepare Top Insights Data
                                    Object.entries(filteredData.reduce((acc, row) => {
                                        const key = row[catCols[1] || catCols[0]] || 'Unknown';
                                        const val = isCountMetric ? 1 : parseSafeNumber(row[activeMetric]);
                                        acc[key] = (acc[key] || 0) + val;
                                        return acc;
                                    }, {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5)
                                }>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" fontSize={10} axisLine={false} tickLine={false} width={80} tick={{ fill: 'var(--text-muted)' }} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="var(--bg-primary)" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

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
                        <AreaChart data={
                            // Aggregate data by date
                            Object.entries(filteredData.reduce((acc, row) => {
                                const key = row[dateCols[0]] || 'Unknown';
                                const val = isCountMetric ? 1 : parseSafeNumber(row[activeMetric]);
                                acc[key] = (acc[key] || 0) + val;
                                return acc;
                            }, {})).map(([name, value]) => ({ name, value })).sort((a, b) => new Date(a.name) - new Date(b.name))
                        }>
                            <defs>
                                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis dataKey="name" fontSize={11} tick={{ fill: 'var(--text-muted)' }}
                                tickFormatter={(val) => {
                                    try { return new Date(val).toLocaleDateString(); } catch (e) { return val; }
                                }}
                            />
                            <YAxis fontSize={11} tick={{ fill: 'var(--text-muted)' }} />
                            <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--text-main)' }} />
                            <Area type="monotone" dataKey="value" name={isCountMetric ? 'Count' : activeMetric} stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorTrend)" />
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
                            <button
                                className="tool-btn"
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    alert("Link copied to clipboard!");
                                }}
                                title="Copy Link to Dashboard"
                            >
                                <Share2 size={16} /> Share
                            </button>
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
                        {isFiltered && (
                            <button className="clear-filters-btn" onClick={clearAllFilters}>
                                <RefreshCw size={12} /> Clear All
                            </button>
                        )}
                        <ChevronDown size={16} />
                    </div>

                    <div className="pane-section overflow-y-auto" style={{ flex: 1 }}>
                        {catCols.map(col => (
                            <div key={col} className="filter-card">
                                <div
                                    className="filter-card-header"
                                    onClick={() => toggleSlicer(col)}
                                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    <span className="field-name">{col}</span>
                                    {collapsedSlicers[col] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                </div>
                                {!collapsedSlicers[col] && (
                                    <div className="filter-options-list">
                                        {(audit.sample_after || [])
                                            .map(d => (d[col] === null || d[col] === undefined) ? "null" : String(d[col]))
                                            .filter((v, i, a) => a.indexOf(v) === i) // Unique
                                            .slice(0, 20)
                                            .map(val => (
                                                <label key={val} className="filter-option" style={{ cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={(selectedFilters[col] || []).includes(val)}
                                                        onChange={() => toggleFilter(col, val)}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    <span style={{ fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{val}</span>
                                                </label>
                                            ))}
                                    </div>
                                )}
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

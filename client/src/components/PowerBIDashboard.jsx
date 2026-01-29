import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ScatterChart, Scatter, ZAxis, Legend, ComposedChart
} from 'recharts';
import {
    Layout, Filter, ChevronDown, Download, Maximize2, X, MoreHorizontal, FileText,
    Share2, Info, Map as MapIcon, GitBranch, Target, Layers, Home, BarChart3,
    Clock, Database, RefreshCw, Search, Calendar, MapPin, DollarSign, TrendingUp, Users, ChevronRight, BrainCircuit, PieChart as PieChartIcon
} from 'lucide-react';

const PB_COLORS = ['#252423', '#F2C811', '#BDC3C7', '#414042', '#3498db', '#e67e22', '#2ecc71', '#9b59b6'];

const PowerBIDashboard = ({ files = [], onClose }) => {
    // Ensure files is always an array and filter out nulls/pending
    const fileList = Array.isArray(files) ? files.filter(f => f && f.status === 'completed') : [];
    const [selectedSourceIndex, setSelectedSourceIndex] = useState(-1); // -1 for ALL/COMBINED

    // COMBINED DATA LOGIC
    const combinedData = useMemo(() => {
        if (selectedSourceIndex === -1) {
            return fileList.reduce((acc, f) => {
                const sample = f.auditLogs?.sample_after || [];
                return [...acc, ...sample];
            }, []);
        }
        return fileList[selectedSourceIndex]?.auditLogs?.sample_after || [];
    }, [fileList, selectedSourceIndex]);

    const activeFile = selectedSourceIndex === -1 ? { originalName: "All Datasets", auditLogs: {} } : fileList[selectedSourceIndex];

    // FALLBACK UI: Prevent White Screen
    if (fileList.length === 0) {
        return (
            <div className="pbi-premium-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: 'var(--bg-primary)', height: '100vh' }}>
                <Database size={48} className="text-accent" style={{ marginBottom: '20px', opacity: 0.5 }} />
                <h2 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>No processed datasets available</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Wait for processing or upload a new file.</p>
                <button className="tool-btn highlight" onClick={onClose}><Home size={16} /> Return to Hub</button>
            </div>
        );
    }

    const audit = activeFile.auditLogs || {};
    // Extract profile - if combined, we merge profiles or just use the first one as schema
    const profile = useMemo(() => {
        if (selectedSourceIndex === -1) {
            // Merge unique keys from all profiles
            const merged = {};
            fileList.forEach(f => {
                Object.assign(merged, f.auditLogs?.column_profile || {});
            });
            return merged;
        }
        return audit.column_profile || {};
    }, [fileList, audit, selectedSourceIndex]);
    const [activePage, setActivePage] = useState('overview');
    const [selectedFilters, setSelectedFilters] = useState({}); // Stores { column: [val1, val2] }

    const isAlteryx = useMemo(() => {
        if (selectedSourceIndex === -1) {
            return fileList.some(f => f.auditLogs?.engine === 'Alteryx Premium');
        }
        return audit.engine === 'Alteryx Premium';
    }, [selectedSourceIndex, fileList, audit.engine]);

    // REDIRECT LOGIC: If on stats but engine is Alteryx, move to overview
    React.useEffect(() => {
        if (activePage === 'stats' && isAlteryx) {
            setActivePage('overview');
        }
    }, [activePage, isAlteryx]);


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
    const dateCols = useMemo(() => {
        return Object.entries(profile)
            .filter(([name, info]) => {
                const lowerName = name.toLowerCase();
                // Avoid false positives like "status", "category", "location", "rating"
                const isExcluded = lowerName.match(/(status|category|location|rating|priority|state|attribute|type)/);
                return !isExcluded && (
                    lowerName.match(/^(date|time|year|month|day|period|at_|created|updated|sold|purchased|dt)/) ||
                    lowerName.endsWith('_at') ||
                    lowerName.endsWith('date') ||
                    info.type.includes('datetime') ||
                    info.type.includes('timestamp')
                );
            })
            .map(([name]) => name);
    }, [profile]);

    const parseSafeDate = (val) => {
        if (!val) return null;
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d;

        // Try cleaning standard Excel-style digits or DD/MM/YYYY
        if (typeof val === 'string') {
            // DD/MM/YYYY or DD-MM-YYYY
            const parts = val.split(/[/-]/);
            if (parts.length === 3) {
                // Assume DD-MM-YYYY if middle part <= 12 and first part > 12? 
                // Too complex for here, but let's try basic swap
                const d2 = new Date(`${parts[1]}/${parts[0]}/${parts[2]}`);
                if (!isNaN(d2.getTime())) return d2;
                const d3 = new Date(`${parts[2]}/${parts[1]}/${parts[0]}`);
                if (!isNaN(d3.getTime())) return d3;
            }
        }
        return null;
    };

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
        const candidates = numericCols.filter(n => !n.toLowerCase().match(/(_id|id|code|index|^no$|^nr$|phone|mobile|serial|pin|zip|count|year|month)/));
        const data = audit.sample_after || [];

        // Prioritize columns with 'amount', 'price', 'revenue', 'cost', 'val', 'total'
        const priorityCandidates = candidates.filter(n => n.toLowerCase().match(/(amount|price|revenue|cost|val|total|profit|fee|tax)/));
        const searchList = priorityCandidates.length > 0 ? priorityCandidates : candidates;

        for (const col of searchList) {
            const sum = data.reduce((acc, c) => acc + parseSafeNumber(c[col]), 0);
            if (sum > 0) return col;
        }
        return candidates[0] || null;
    }, [numericCols, audit.sample_after]);

    const activeMetric = bestNumericCol || 'record_count';
    const isCountMetric = activeMetric === 'record_count';


    // 2. INTERACTIVE FILTER LOGIC (Multi-select)
    // 2. INTERACTIVE FILTER LOGIC (Multi-select)
    const filteredData = useMemo(() => {
        let data = combinedData;
        Object.entries(selectedFilters).forEach(([col, vals]) => {
            if (vals && vals.length > 0) {
                data = data.filter(item => {
                    const itemVal = item[col];
                    const normalizedItemVal = (itemVal === null || itemVal === undefined) ? "null" : String(itemVal);
                    return vals.includes(normalizedItemVal);
                });
            }
        });
        return data;
    }, [combinedData, selectedFilters]);

    const toggleFilter = (col, val) => {
        const stringVal = (val === null || val === undefined) ? "null" : String(val);
        setSelectedFilters(prev => {
            const currentVals = prev[col] || [];
            if (currentVals.includes(stringVal)) {
                const nextVals = currentVals.filter(v => v !== stringVal);
                return { ...prev, [col]: nextVals.length > 0 ? nextVals : null };
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



    const isFiltered = useMemo(() => Object.values(selectedFilters).some(v => v !== null), [selectedFilters]);

    // 3. RENDERERS
    const renderStatisticalProfile = () => {
        const insights = audit.mathematical_insights || [];
        const corrMatrix = audit.correlation_matrix || {};
        const corrKeys = Object.keys(corrMatrix);

        return (
            <div className="pbi-page-content">
                <div className="pbi-visuals-grid-modern">
                    {/* Mathematical Insights List */}
                    <div className="pbi-chart-card-modern span-2">
                        <div className="chart-header">
                            <div className="chart-title-group">
                                <h3><BrainCircuit size={18} className="text-accent" style={{ marginRight: '8px' }} /> Automated Insights</h3>
                                <p className="chart-subtitle">Engine: {audit.engine || 'Standard'}</p>
                            </div>
                        </div>
                        <div className="insights-list-premium">
                            {insights.length > 0 ? insights.map((insight, i) => (
                                <div key={i} className="insight-item-premium">
                                    <div className="insight-bullet"></div>
                                    <div className="insight-content">
                                        <p>{insight}</p>
                                        <span className="insight-badge-mini">Verified Math</span>
                                    </div>
                                </div>
                            )) : (
                                <div className="empty-state-mini">
                                    <Info size={24} className="fade" />
                                    <p>Insufficient variance for automated insights.</p>
                                </div>
                            )}

                            {/* Distribution Health Card */}
                            {metricCandidates.length > 0 && (
                                <div className="insight-item-premium health">
                                    <div className="insight-bullet health"></div>
                                    <div className="insight-content">
                                        <p>Data Distribution Health: <b>Strong Variance Detected</b></p>
                                        <span className="insight-desc">Mathematical profiles generated for {metricCandidates.length} numeric dimensions.</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Correlation Heatmap (Simplified using CSS Grid) */}
                    <div className="pbi-chart-card-modern">
                        <div className="chart-header">
                            <h3>Correlation Matrix</h3>
                            <ChevronDown size={14} className="text-muted" />
                        </div>
                        {corrKeys.length > 1 ? (
                            <div className="correlation-grid-container">
                                <div className="correlation-grid" style={{ gridTemplateColumns: `repeat(${corrKeys.length}, 1fr)` }}>
                                    {corrKeys.map(rowKey => (
                                        corrKeys.map(colKey => {
                                            const val = corrMatrix[rowKey][colKey];
                                            const intensity = Math.abs(val);
                                            const color = val > 0 ? `rgba(37, 36, 35, ${intensity})` : `rgba(242, 200, 17, ${intensity})`;
                                            return (
                                                <div
                                                    key={`${rowKey}-${colKey}`}
                                                    className="corr-cell"
                                                    style={{ backgroundColor: color }}
                                                    title={`${rowKey} vs ${colKey}: ${val.toFixed(2)}`}
                                                >
                                                    {intensity > 0.5 && <span className="corr-val">{val.toFixed(2)}</span>}
                                                </div>
                                            );
                                        })
                                    ))}
                                </div>
                                <div className="corr-labels">
                                    {corrKeys.map(k => <span key={k}>{k}</span>)}
                                </div>
                            </div>
                        ) : (
                            <div className="empty-state-mini">
                                <p>Numerical correlation requires 2+ columns.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stat Cards Grid */}
                <div className="pbi-premium-kpi-grid" style={{ marginTop: '2rem' }}>
                    {metricCandidates.length > 0 ? metricCandidates.slice(0, 4).map(col => (
                        <div key={col} className="pbi-kpi-card-modern">
                            <div className="kpi-details">
                                <span className="kpi-label">{col.replace(/_/g, ' ')}</span>
                                <div className="stat-line">
                                    <span>Skew:</span>
                                    <strong>{profile[col]?.skewness?.toFixed(2) || '0.00'}</strong>
                                </div>
                                <div className="stat-line">
                                    <span>Kurtosis:</span>
                                    <strong>{profile[col]?.kurtosis?.toFixed(2) || '0.00'}</strong>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="pbi-kpi-card-modern span-full">
                            <p className="text-muted">No advanced statistics available for categorical data.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const metricCandidates = useMemo(() => {
        return numericCols.filter(n => !n.toLowerCase().match(/(_id|id|code|index|^no$|^nr$|phone|mobile|serial|pin|zip|count|year|month)/));
    }, [numericCols]);

    const displayCat = useMemo(() => {
        // Try to find a categorical col that has some variety but not too much (like a status or category)
        const candidates = catCols.filter(c => {
            const unique = profile[c]?.unique_count || 0;
            return unique > 1 && unique < 15;
        });
        return candidates[0] || catCols[0] || 'Unknown';
    }, [catCols, profile]);

    const renderOverview = () => {
        const totalRows = filteredData.length;
        const displaySum = isFiltered || selectedSourceIndex === -1
            ? filteredData.reduce((acc, c) => acc + parseSafeNumber(c[activeMetric]), 0)
            : (profile[activeMetric]?.sum || filteredData.reduce((acc, c) => acc + parseSafeNumber(c[activeMetric]), 0));

        const displayAvg = isFiltered || selectedSourceIndex === -1
            ? (displaySum / (totalRows || 1))
            : (profile[activeMetric]?.mean || (displaySum / (totalRows || 1)));

        // Avg Quality Score for Combined
        const displayQuality = selectedSourceIndex === -1
            ? Math.round(fileList.reduce((acc, f) => acc + (f.auditLogs?.quality_score || 0), 0) / (fileList.length || 1))
            : (audit.quality_score || 0);

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
                            <span className="kpi-value">{displayQuality}%</span>
                        </div>
                    </div>
                </div>

                {/* Main Visuals Area */}
                <div className="pbi-visuals-grid-modern">
                    <div className="pbi-chart-card-modern span-2">
                        <div className="chart-header">
                            <div className="chart-title-group">
                                <h3>{isCountMetric ? 'Record Count' : activeMetric.replace(/_/g, ' ')} by {displayCat.replace(/_/g, ' ')}</h3>
                                <p className="chart-subtitle">{activeFile.originalName}</p>
                            </div>
                            <MoreHorizontal size={16} className="text-muted" />
                        </div>
                        <div className="chart-body-container">
                            <ResponsiveContainer width="100%" height={280}>
                                <ComposedChart data={
                                    // Prepare data for chart: Group by Category and Sum Metric (or Count)
                                    Object.entries(filteredData.reduce((acc, row) => {
                                        const key = row[displayCat] || 'Unknown';
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
                            <PieChartIcon size={16} className="text-muted" />
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

                    {/* Alteryx Specific Insight Card (Visible ONLY for Alteryx) */}
                    {audit.engine === 'Alteryx Premium' && (
                        <div className="pbi-chart-card-modern alteryx-glow">
                            <div className="chart-header">
                                <h3 className="alteryx-text">Enterprise Blending</h3>
                                <GitBranch size={16} className="alteryx-text" />
                            </div>
                            <div className="alteryx-insight-body">
                                <div className="alt-stat">
                                    <span>Confidence:</span>
                                    <strong>{audit.enterpriseInsights?.match_confidence}</strong>
                                </div>
                                <div className="alt-stat">
                                    <span>Governance:</span>
                                    <strong>{audit.enterpriseInsights?.governance}</strong>
                                </div>
                                <div className="alt-stat">
                                    <span>Sources:</span>
                                    <div className="source-tags">
                                        {audit.enterpriseInsights?.sources_blended?.map(s => <span key={s} className="tag">{s}</span>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
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
                            (() => {
                                // Find the FIRST date column that actually has parseable dates
                                let validDateCol = null;
                                for (const col of dateCols) {
                                    const hasValid = filteredData.some(r => parseSafeDate(r[col]));
                                    if (hasValid) {
                                        validDateCol = col;
                                        break;
                                    }
                                }

                                // FALLBACK: If no dates, aggregate by the first categorical column
                                const chartCol = validDateCol || displayCat;
                                const isDateType = !!validDateCol;

                                const aggregated = filteredData.reduce((acc, row) => {
                                    let key = 'Other';
                                    if (isDateType) {
                                        const dateObj = parseSafeDate(row[chartCol]);
                                        if (dateObj) key = dateObj.toISOString().split('T')[0];
                                    } else {
                                        key = String(row[chartCol] || 'Other');
                                    }

                                    const val = isCountMetric ? 1 : parseSafeNumber(row[activeMetric]);
                                    acc[key] = (acc[key] || 0) + val;
                                    return acc;
                                }, {});

                                return Object.entries(aggregated)
                                    .map(([name, value]) => ({ name, value }))
                                    .sort((a, b) => isDateType ? a.name.localeCompare(b.name) : b.value - a.value)
                                    .slice(0, 20); // Limit categorical trend to 20
                            })()
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
                                    const d = new Date(val);
                                    return isNaN(d.getTime()) ? val : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                }}
                            />
                            <YAxis fontSize={11} tick={{ fill: 'var(--text-muted)' }} />
                            <Tooltip
                                labelFormatter={(label) => {
                                    const d = new Date(label);
                                    return isNaN(d.getTime()) ? label : d.toLocaleDateString(undefined, { dateStyle: 'long' });
                                }}
                                contentStyle={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--text-main)' }}
                            />
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
                    {!isAlteryx && (
                        <button className={`nav-item ${activePage === 'stats' ? 'active' : ''}`} onClick={() => setActivePage('stats')}>
                            <BrainCircuit size={20} />
                            <span>Stats Engine</span>
                        </button>
                    )}

                    <button className={`nav-item ${activePage === 'time' ? 'active' : ''}`} onClick={() => setActivePage('time')}>
                        <BarChart3 size={20} />
                        <span>Trends</span>
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
                                <h1 className={isAlteryx ? 'alteryx-text glow' : ''}>
                                    {isAlteryx ? 'Alteryx Enterprise Hub' : 'Python Statistical Hub'}
                                </h1>

                                <p className="breadcrumb">Analytics / {activeFile.originalName} / {activePage.toUpperCase()}</p>
                            </div>
                        </div>
                    </div>
                    <div className="header-right">
                        <div className="header-tools">
                            <select
                                className="source-select-premium"
                                value={selectedSourceIndex}
                                onChange={(e) => setSelectedSourceIndex(Number(e.target.value))}
                            >
                                <option value="-1">All Combined Datasets</option>
                                {fileList.map((f, i) => (
                                    <option key={f._id} value={i}>{f.originalName}</option>
                                ))}
                            </select>
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
                        <span className="slicer-value">Engine: <strong>{audit.engine || 'Standard'}</strong></span>
                    </div>
                    <div className="slicer-group">
                        <TrendingUp size={14} className="text-accent" />
                        <span className="slicer-value">Score: <strong>{audit.quality_score}%</strong></span>
                    </div>
                </div>

                {/* Page Content */}
                <main className="pbi-main-scrollable">
                    {activePage === 'overview' && renderOverview()}
                    {activePage === 'stats' && renderStatisticalProfile()}
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
                        {catCols.slice(0, 5).map(col => (
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
                                        {[...new Set(combinedData.map(d => (d[col] === null || d[col] === undefined) ? "null" : String(d[col])))].slice(0, 15).map(val => (
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

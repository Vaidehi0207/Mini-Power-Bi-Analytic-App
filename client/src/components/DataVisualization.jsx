import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const COLORS = ['#6366f1', '#4ade80', '#f87171', '#fbbf24'];

const DataVisualization = ({ file }) => {
    if (!file || !file.auditLogs) return null;
    const audit = file.auditLogs;

    // Row comparison data
    const rowData = [
        { name: 'Initial Rows', value: audit.rows_before },
        { name: 'Cleaned Rows', value: audit.rows_after },
    ];

    // Data Quality Breakdown
    const qualityData = [
        { name: 'Cleaned', value: audit.rows_after },
        { name: 'Duplicates', value: audit.duplicates_removed },
        { name: 'Empty Rows', value: audit.empty_rows_removed },
    ].filter(d => d.value > 0);

    return (
        <div className="visualization-container">
            <div className="viz-grid">
                {/* Bar Chart: Processing Result */}
                <div className="viz-card">
                    <h4>Processing Impact</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={rowData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="name" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip
                                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                itemStyle={{ color: '#f8fafc' }}
                            />
                            <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Pie Chart: Quality Breakdown */}
                <div className="viz-card">
                    <h4>Data Quality Breakdown</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={qualityData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {qualityData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default DataVisualization;

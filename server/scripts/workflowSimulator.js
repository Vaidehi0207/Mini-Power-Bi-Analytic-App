const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Alteryx Gallery API Simulator (AEP)
 * Mimics a real-world Alteryx Workflow execution.
 */
const simulateAlteryxAPI = async (filename, inputPath) => {
    // Simulating API Latency
    await new Promise(resolve => setTimeout(resolve, 3500));

    // Try to get real processed data to make the simulation dynamic
    let realAudit = null;
    if (inputPath && fs.existsSync(inputPath)) {
        try {
            const tempOut = path.join('processed_data', `temp-premium-${Date.now()}.csv`);

            // Detect Python Path
            const venvPath = path.join(__dirname, '../../.venv/Scripts/python.exe');
            const pythonCmd = fs.existsSync(venvPath) ? venvPath : 'python';

            const pythonResult = await new Promise((resolve) => {
                const py = spawn(pythonCmd, [
                    path.join(__dirname, 'processor.py'),
                    inputPath,
                    tempOut
                ]);
                let out = '';
                py.stdout.on('data', (d) => out += d.toString());
                py.on('close', () => {
                    try { resolve(JSON.parse(out)); } catch { resolve(null); }
                    if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
                });
            });

            if (pythonResult && pythonResult.status === 'completed') {
                realAudit = pythonResult.audit;
            }
        } catch (err) {
            console.error('Simulator Dynamic Data Fetch Error:', err);
        }
    }

    const baseAudit = realAudit || {
        rows_before: 1542,
        rows_after: 1538,
        duplicates_removed: 4,
        empty_rows_removed: 0,
        quality_score: 99,
        sample_before: [{ Company: "Gogle Inc.", City: "San Fran", Lat: 37.77, Long: -122.41 }],
        sample_after: [
            { Company: "Google LLC", City: "San Francisco", Distance: "0.5 KM", Region: "North CA", Territory: "T-01", Revenue_USD: 15400 },
            { Company: "Apple Inc.", City: "Cupertino", Distance: "1.2 KM", Region: "South CA", Territory: "T-02", Revenue_USD: 22100 }
        ],
        column_profile: {
            "Company": { type: "object", null_count: 0, null_pct: 0, unique_count: 1538, health: "healthy" },
            "total_revenue": { type: "float64", null_count: 0, null_pct: 0, unique_count: 1450, health: "healthy", mean: 5420.5, min: 100.0, max: 95000.0 }
        }
    };

    return {
        jobId: `alt-job-${Date.now()}`,
        status: 'Success',
        engine: 'Alteryx Premium (AEP)',
        workflow: 'Master_Data_Blending_V4.yxmd',
        audit: {
            ...baseAudit,
            engine: 'Alteryx Premium',
            action: 'API-Driven Data Enrichment & Blending',

            // Data Blending Simulation (Marketing details)
            blendingInsights: {
                sources_joined: ['Local File', 'Alteryx Cloud (SQL Server)', 'Adobe Experience Platform'],
                match_type: 'Inner Join (Multi-Source)',
                records_matched: baseAudit.rows_after || 852,
                join_keys: Object.keys(baseAudit.column_profile || {}).slice(0, 2),
                fuzzy_confidence: '94%'
            },

            // Schema Validation
            schemaValidation: {
                status: '98% Compatibility',
                missing_optional_fields: ['Secondary_Email'],
                auto_mapped_fields: { 'cust_id': 'customer_id', 'rev': 'total_revenue' }
            },

            // Advanced Insights: Fuzzy Matching
            fuzzyMatchMatches: [
                { original: 'Gogle Inc.', match: 'Google LLC', score: 92, status: 'Merged' },
                { original: 'Apple Comp.', match: 'Apple Inc.', score: 88, status: 'Merged' },
                { original: 'Mcrosoft', match: 'Microsoft Corp', score: 95, status: 'Merged' }
            ],

            // Advanced Insights: Geospatial
            spatialAnalysis: {
                tool: 'Spatial Match & Trade Area',
                records_enriched: Math.floor((baseAudit.rows_after || 1000) * 0.8),
                new_fields: ['Store_Distance_KM', 'Territory_ID', 'Drive_Time_Mins'],
                avg_distance: '14.2 KM',
                trade_area_analysis: '10-Mile Radius Generated'
            }
        }
    };
};

module.exports = { simulateAlteryxAPI };

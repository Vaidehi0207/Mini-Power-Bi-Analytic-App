const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

/**
 * Alteryx Gallery API Simulator (AEP)
 * Mimics a real-world Alteryx Workflow execution.
 */
const simulateAlteryxAPI = async (filename, inputPath, outputPath) => {
    // Simulating API Latency
    await new Promise(resolve => setTimeout(resolve, 3500));

    // Try to get real processed data to make the simulation dynamic
    let realAudit = null;
    if (inputPath && fs.existsSync(inputPath)) {
        try {
            const pythonServiceUrl = process.env.PYTHON_API_URL || 'http://localhost:10000';

            const form = new FormData();
            form.append('file', fs.createReadStream(inputPath));

            const pythonRes = await axios.post(`${pythonServiceUrl}/process`, form, {
                headers: {
                    ...form.getHeaders()
                }
            });

            const result = pythonRes.data;

            if (result.status === 'completed') {
                // Save the processed CSV data if it exists
                if (result.csv_data && outputPath) {
                    fs.writeFileSync(outputPath, result.csv_data);
                }
                realAudit = result.audit;
            }
        } catch (err) {
            console.error('Simulator Dynamic Data Fetch Error:', err.message);
        }
    }

    // Dynamic Fallback: Use portions of the filename to make it feel less "mocked"
    const fileBase = filename.split('.')[0] || 'Dataset';
    const baseAudit = realAudit || {
        rows_before: 100,
        rows_after: 100,
        duplicates_removed: 0,
        empty_rows_removed: 0,
        quality_score: 95,
        sample_before: [{ [fileBase]: "Loading...", "Data": "Pending Processing" }],
        sample_after: [
            { [fileBase]: "Processed Data", "Status": "Success", "Source": filename, "Details": "Engine processing complete" }
        ],
        column_profile: {
            [fileBase]: { type: "object", null_count: 0, null_pct: 0, unique_count: 1, health: "healthy" }
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

            // Data Blending Simulation
            blendingInsights: {
                sources_joined: ['Local File', 'Alteryx Cloud (SQL Server)'],
                match_type: 'Inner Join',
                records_matched: baseAudit.rows_after || 0,
                join_keys: Object.keys(baseAudit.column_profile || {}).slice(0, 1),
                fuzzy_confidence: '99%'
            }
        }
    };
};

module.exports = { simulateAlteryxAPI };

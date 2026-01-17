import React from 'react';
import { Database, Filter, Zap, FileJson, GitMerge, Globe, ArrowRight, Download, Share2, FileText } from 'lucide-react';

const WorkflowNode = ({ type, label, sublabel, config, icon: Icon, isLast }) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="workflow-node">
                <div className={`node-icon-wrapper ${type}`}>
                    <Icon size={32} />
                    {config && <div className="node-config-badge">{config}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span className="node-label">{label}</span>
                    <span className="node-sublabel">{sublabel}</span>
                </div>
            </div>
            {!isLast && (
                <div style={{ padding: '0 20px' }}>
                    <ArrowRight className="text-muted" style={{ color: 'rgba(255,255,255,0.2)' }} />
                </div>
            )}
        </div>
    );
};

const WorkflowCanvas = ({ file }) => {
    const audit = file.auditLogs;
    const isPremium = file.processingType === 'premium';

    const getStandardNodes = () => [
        { type: 'input', label: 'Input Data', sublabel: file.originalName, icon: Database, config: "Format: CSV/Excel" },
        { type: 'prep', label: 'Data Cleansing', sublabel: `${audit.empty_rows_removed} empty rows`, icon: Filter, config: "Replace Nulls: Median/Unknown" },
        { type: 'prep', label: 'Unique (Duplicates)', sublabel: `${audit.duplicates_removed} dups`, icon: Filter, config: "Match: Exact" },
        { type: 'prep', label: 'Formula (Cleaning)', sublabel: 'Auto-Standardized', icon: Zap, config: "Case: Snake_Case" },
        { type: 'output', label: 'Output Data', sublabel: 'Processed CSV', icon: FileJson, config: "Target: Local Storage" },
    ];

    const getPremiumNodes = () => [
        { type: 'input', label: 'API / Source Input', sublabel: 'AEP API Entry', icon: Database, config: "Auth: Oauth2" },
        { type: 'join', label: 'Join / Blending', sublabel: `${audit.blendingInsights?.sources_joined?.length || 2} Sources`, icon: GitMerge, config: `Type: ${audit.blendingInsights?.match_type || 'Inner'}` },
        { type: 'enrich', label: 'Fuzzy Match', sublabel: `${audit.fuzzyMatchMatches?.length || 3} Matches`, icon: Zap, config: "Threshold: 85%" },
        { type: 'enrich', label: 'Spatial Analysis', sublabel: audit.spatialAnalysis?.avg_distance || 'Geo-Enriched', icon: Globe, config: "Tool: Trade Area" },
        { type: 'output', label: 'Output Data', sublabel: 'Premium Dataset', icon: FileText, config: "Cloud: Azure/S3" },
    ];

    const nodes = isPremium ? getPremiumNodes() : getStandardNodes();

    return (
        <div className="workflow-container">
            <div className="workflow-canvas">
                {nodes.map((node, index) => (
                    <WorkflowNode
                        key={index}
                        {...node}
                        isLast={index === nodes.length - 1}
                    />
                ))}
            </div>
        </div>
    );
};

export default WorkflowCanvas;

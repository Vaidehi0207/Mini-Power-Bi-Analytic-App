import React, { useState } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const FileUpload = ({ onUploadSuccess }) => {
    const { user } = useAuth();
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [processingType, setProcessingType] = useState('standard');
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            const validTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
            if (validTypes.includes(selectedFile.type)) {
                setFile(selectedFile);
                setError(null);
            } else {
                setError('Please select a CSV or Excel file.');
                setFile(null);
            }
        }
    };

    const handleUpload = async () => {
        if (!user) {
            setError('Please login to process data.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('processingType', processingType);

        setIsUploading(true);
        setMessage(null);
        setError(null);

        try {
            const response = await api.post('/data/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setMessage('File uploaded successfully!');
            setFile(null);
            if (onUploadSuccess) onUploadSuccess(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to upload file.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="upload-container">
            {/* Engine Selection */}
            <div className="engine-selector">
                <button
                    className={`engine-btn ${processingType === 'standard' ? 'active' : ''}`}
                    onClick={() => setProcessingType('standard')}
                >
                    Standard (Python)
                </button>
                <button
                    className={`engine-btn premium ${processingType === 'premium' ? 'active' : ''}`}
                    onClick={() => setProcessingType('premium')}
                >
                    Premium (Alteryx)
                </button>
            </div>

            <div className={`upload-dropzone ${file ? 'has-file' : ''}`}>
                <input
                    type="file"
                    id="file-upload"
                    onChange={handleFileChange}
                    accept=".csv, .xlsx, .xls"
                    hidden
                />

                {!file ? (
                    <label htmlFor="file-upload" className="upload-label">
                        <Upload size={48} className="upload-icon" />
                        <h3>Drop your data file here</h3>
                        <p>Supports .csv, .xlsx, .xls</p>
                        <span className="browse-btn">Browse Files</span>
                    </label>
                ) : (
                    <div className="file-preview">
                        <File size={32} className="file-icon" />
                        <div className="file-info">
                            <span className="file-name">{file.name}</span>
                            <span className="file-size">{(file.size / 1024).toFixed(2)} KB</span>
                        </div>
                        <button onClick={() => setFile(null)} className="clear-btn">
                            <X size={20} />
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div className="status-msg error">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {message && (
                <div className="status-msg success">
                    <CheckCircle size={18} />
                    <span>{message}</span>
                </div>
            )}

            <button
                className="upload-submit-btn"
                disabled={!file || isUploading}
                onClick={handleUpload}
            >
                {isUploading ? (
                    <>
                        <Loader2 className="animate-spin" size={20} />
                        Uploading...
                    </>
                ) : (
                    'Process with Anti-Gravity'
                )}
            </button>
        </div>
    );
};

export default FileUpload;

const path = require('path');
const fs = require('fs');

/**
 * Detects the correct Python command based on the environment and standard OS patterns.
 */
const getPythonCommand = () => {
    // 1. Check for Windows Virtual Env
    const venvWindows = path.join(__dirname, '.venv/Scripts/python.exe');
    if (fs.existsSync(venvWindows)) return venvWindows;

    // 2. Check for Linux/Unix Virtual Env
    const venvLinux = path.join(__dirname, '.venv/bin/python');
    if (fs.existsSync(venvLinux)) return venvLinux;

    // 3. Fallback to system commands
    // On most Linux (Render), 'python3' is the standard
    const isWindows = process.platform === 'win32';
    return isWindows ? 'python' : 'python3';
};

// Centralized Absolute Paths
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
const PROCESSED_DATA_DIR = path.resolve(__dirname, 'processed_data');

// Ensure directories exist on startup
const ensureDirs = () => {
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    if (!fs.existsSync(PROCESSED_DATA_DIR)) fs.mkdirSync(PROCESSED_DATA_DIR, { recursive: true });
};

module.exports = {
    getPythonCommand,
    UPLOADS_DIR,
    PROCESSED_DATA_DIR,
    ensureDirs
};

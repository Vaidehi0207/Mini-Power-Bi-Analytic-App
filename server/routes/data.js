const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const DataFile = require('../models/DataFile');
const { simulateAlteryxAPI } = require('../scripts/workflowSimulator');

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const fileTypes = /csv|xlsx|xls/;
        const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
        if (extName) {
            return cb(null, true);
        }
        cb(new Error('Only CSV or Excel files are allowed'));
    }
});

const { spawn } = require('child_process');

// @route   POST /api/data/upload
// @desc    Upload and process a data file
router.post('/upload', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }

        const inputPath = req.file.path;
        const outFilename = `processed-${req.file.filename.split('.')[0]}.csv`;
        const outputPath = path.join('processed_data', outFilename);

        // Ensure processed_data directory exists
        if (!fs.existsSync('processed_data')) {
            fs.mkdirSync('processed_data', { recursive: true });
        }

        const processingType = req.body.processingType || 'standard';

        const newFile = new DataFile({
            filename: req.file.filename,
            originalName: req.file.originalname,
            owner: req.user.id,
            filePath: inputPath,
            fileType: path.extname(req.file.originalname).replace('.', ''),
            processingType,
            status: 'processing'
        });

        const file = await newFile.save();

        // Respond immediately
        res.status(201).json(file);

        if (processingType === 'premium') {
            console.log(`🚀 API Request sent to Alteryx Gallery for: ${file.originalName}`);

            // Option 1: Alteryx Engine API (AEP) - Calling our Simulator Service
            simulateAlteryxAPI(file.originalName, inputPath).then(async (apiResult) => {
                file.status = 'completed';
                file.auditLogs = apiResult.audit;
                file.processingLogs = `Alteryx Job ID: ${apiResult.jobId}\nWorkflow: ${apiResult.workflow}\nStatus: ${apiResult.status}`;
                await file.save();
                console.log('✅ Alteryx API Response received and file updated.');
            }).catch(async (err) => {
                file.status = 'failed';
                file.processingLogs = `Alteryx API Error: ${err.message}`;
                await file.save();
            });

            return;
        }

        // Detect Python Path (support venv if exists)
        const venvPath = path.join(__dirname, '../../.venv/Scripts/python.exe');
        const pythonCmd = fs.existsSync(venvPath) ? venvPath : 'python';

        // Standard Python Processing
        const pythonProcess = spawn(pythonCmd, [
            path.join(__dirname, '../scripts/processor.py'),
            inputPath,
            outputPath
        ]);

        let outputData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => {
            outputData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
            console.error(`Python stderr: ${data}`);
        });

        pythonProcess.on('close', async (code) => {
            try {
                if (code !== 0) {
                    console.error(`Python process exited with code ${code}. Stderr: ${errorData}`);
                }

                const result = JSON.parse(outputData || '{}');
                file.status = result.status === 'completed' ? 'completed' : 'failed';
                file.auditLogs = result.audit;
                file.processingLogs = outputData + (errorData ? `\nERRORS:\n${errorData}` : '');
                await file.save();
                console.log(`Standard Processing finished for ${file.originalName}: ${file.status}`);
            } catch (err) {
                console.error('Error updating file status:', err);
                file.status = 'failed';
                file.processingLogs = `JSON Parse Error: ${err.message}\nRaw Output: ${outputData}\nStderr: ${errorData}`;
                await file.save();
            }
        });

    } catch (err) {
        console.error('Upload Error:', err);
        res.status(500).json({ message: 'File upload failed', error: err.message });
    }
});

// @route   GET /api/data/files
// @desc    Get all files for current user
router.get('/files', auth, async (req, res) => {
    try {
        const files = await DataFile.find({ owner: req.user.id }).sort({ uploadedAt: -1 });
        res.json(files);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching files' });
    }
});

// @route   DELETE /api/data/:id
// @desc    Delete a data file
router.delete('/:id', auth, async (req, res) => {
    try {
        const file = await DataFile.findById(req.params.id);

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Check user ownership
        if (file.owner.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        // Delete files from disk
        if (fs.existsSync(file.filePath)) {
            fs.unlinkSync(file.filePath);
        }

        const outFilename = `processed-${file.filename.split('.')[0]}.csv`;
        const outputPath = path.join('processed_data', outFilename);
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }

        await file.deleteOne();
        res.json({ message: 'File removed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error deleting file' });
    }
});

// @route   GET /api/data/download/:id
// @desc    Download the processed CSV file
router.get('/download/:id', auth, async (req, res) => {
    try {
        const file = await DataFile.findById(req.params.id);

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Check user ownership
        if (file.owner.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        // Robust filename parsing to handle potential double dots or complex names
        const parsedStored = path.parse(file.filename);
        const parsedOriginal = path.parse(file.originalName);

        // Try multiple potential naming conventions to find the file
        const candidates = [
            `processed-${parsedStored.name}.csv`,
            `processed-${file.filename}`,
            `processed-${parsedOriginal.name}.csv`
        ];

        let finalOutputPath = null;
        for (const candidate of candidates) {
            const checkPath = path.resolve(__dirname, '../processed_data', candidate);
            if (fs.existsSync(checkPath)) {
                finalOutputPath = checkPath;
                break;
            }
        }

        if (!finalOutputPath) {
            console.error(`Download Error: Could not find processed file. Checked candidates: ${candidates.join(', ')} in ${path.resolve(__dirname, '../processed_data')}`);
            return res.status(404).json({ message: 'Processed file not found on disk' });
        }

        res.download(finalOutputPath, `cleaned_${file.originalName.split('.')[0]}.csv`);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error downloading file' });
    }
});

module.exports = router;

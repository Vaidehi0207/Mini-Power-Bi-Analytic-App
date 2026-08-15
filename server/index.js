const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like local scripts) or matching patterns
        if (!origin ||
            origin.includes('localhost') ||
            origin.endsWith('.vercel.app') ||
            origin === 'https://mini-power-bi-analytic-app.vercel.app') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
})); // Allows our frontend to communicate with this backend
app.use(express.json()); // Allows us to parse JSON data in requests

// JSON Syntax Error Handler
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('JSON Syntax Error:', err.message);
        console.error('Raw Body:', req.body);
        return res.status(400).json({ message: 'Malformed JSON request', error: err.message });
    }
    next();
});

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.method === 'POST') console.log('Body:', req.body);
    next();
});

// Database Connection Middleware check
app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next();
    if (mongoose.connection.readyState !== 1) {
        console.warn('⚠️ Request received but Database is not connected yet.');
        return res.status(503).json({ message: 'Database connection in progress or unavailable. Please try again in a moment.' });
    }
    next();
});

// Basic Route to check if server is running
app.get('/', (req, res) => {
    res.send('Mini Power BI API is running... [v3.1]');
});

// Health Check for Deployment
app.get('/api/health', (req, res) => {
    res.json({
        status: 'UP',
        dbStatus: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
        version: '2.2',
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/data', require('./routes/data'));

// Start Express Server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
});

// Connect to MongoDB with fallback
const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in .env file');
        }

        console.log('⏳ Connecting to primary MongoDB Atlas...');
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 3000,
        });

        console.log('✅ MongoDB Connected to Cloud Atlas!');
        console.log('Database Name:', mongoose.connection.name);

    } catch (err) {
        console.error('⚠️ Primary MongoDB Atlas Connection Failed:', err.message);
        
        try {
            console.log('⏳ Attempting connection to local MongoDB (127.0.0.1)...');
            await mongoose.connect('mongodb://127.0.0.1:27017/mini_power_bi', {
                serverSelectionTimeoutMS: 2000,
            });
            console.log('✅ Connected to Local MongoDB (127.0.0.1) successfully!');
        } catch (localErr) {
            console.log('⏳ Local MongoDB not found. Initializing MongoMemoryServer fallback...');
            try {
                const { MongoMemoryServer } = require('mongodb-memory-server');
                const mongoServer = await MongoMemoryServer.create();
                const mongoUri = mongoServer.getUri();

                await mongoose.connect(mongoUri);
                console.log('✅ Connected to In-Memory MongoDB Fallback successfully!');
                console.log('URI:', mongoUri);
            } catch (fallbackErr) {
                console.error('❌ Fallback MongoDB Connection Error:', fallbackErr.message);
                console.error('Retrying primary connection in 10 seconds...');
                setTimeout(connectDB, 10000);
            }
        }
    }
};

connectDB();

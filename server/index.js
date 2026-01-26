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
    origin: [
        "http://localhost:5173",
        "https://mini-power-bi-analytic-app.vercel.app"
    ],
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

// Basic Route to check if server is running
app.get('/', (req, res) => {
    res.send('Mini Power BI API is running...');
});

// Connect to MongoDB & Start Server
const startServer = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in .env file');
        }

        console.log('⏳ Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s if unable to reach server
        });

        console.log('✅ MongoDB Connected');
        console.log('Database Name:', mongoose.connection.name);

        // Start the server only after DB connection
        app.listen(PORT, () => {
            console.log(`🚀 [DEBUG MODE V2] Server is running on http://localhost:${PORT}`);
            console.log(`Timestamp: ${new Date().toISOString()}`);
        });

    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        console.error('Possible fixes:');
        console.error('1. Check your MONGO_URI in .env');
        console.error('2. Ensure your IP is whitelisted in MongoDB Atlas');
        console.error('3. Check your internet connection');
        process.exit(1); // Exit if connection fails
    }
};

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/data', require('./routes/data'));

startServer();

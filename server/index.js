const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Allows our frontend to communicate with this backend
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

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.log('❌ MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/data', require('./routes/data'));

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 [DEBUG MODE V2] Server is running on http://localhost:${PORT}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
});

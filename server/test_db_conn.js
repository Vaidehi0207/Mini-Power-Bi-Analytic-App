const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

console.log('Testing connection to:', process.env.MONGO_URI.split('@')[1]); // Log only the host part for safety

mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
        console.log('✅ Connection successful!');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Connection failed:');
        console.error(err);
        process.exit(1);
    });

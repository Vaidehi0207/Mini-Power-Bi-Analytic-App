const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('./models/User');
require('dotenv').config();

const email = 'cse21085@glbitm.ac.in';

const generateToken = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found');
            process.exit(1);
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        user.verificationToken = verificationToken;
        user.isVerified = false; // Ensure it is unverified
        await user.save();

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        console.log(`VERIFICATION_LINK: ${frontendUrl}/verify-email/${verificationToken}`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

generateToken();

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const auth = require('../middleware/auth');

// @route   POST /api/auth/signup
// @desc    Register a new user
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Configure Email Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// @route   POST /api/auth/signup
// @desc    Register a new user & send verification email
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password, fullName } = req.body;

        let userByEmail = await User.findOne({ email });
        if (userByEmail) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        let userByUsername = await User.findOne({ username });
        if (userByUsername) {
            return res.status(400).json({ message: 'Username is already taken' });
        }

        // Generate Verification Token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        const user = new User({
            username,
            email,
            password,
            fullName,
            isVerified: false,
            verificationToken
        });

        await user.save();

        // Send Email
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const verificationUrl = `${frontendUrl}/verify-email/${verificationToken}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verify Your Mini-Analyst Account',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #6366f1;">Welcome to Mini-Analyst!</h2>
                    <p>Hi ${fullName || username},</p>
                    <p>Please click the button below to verify your email address and activate your account:</p>
                    <a href="${verificationUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">Verify Email</a>
                    <p>Or paste this link in your browser:</p>
                    <p>${verificationUrl}</p>
                </div>
            `
        };

        // Send Email (Async but with logging)
        console.log(`⏳ Attempting to send verification email to: ${email}`);
        const mailPromise = transporter.sendMail(mailOptions);

        // We'll wait for the email but with a timeout to avoid hanging the UI
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Email send timed out after 10s')), 10000)
        );

        try {
            if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                await Promise.race([mailPromise, timeoutPromise]);
                console.log(`✅ Verification email successfully sent to ${email}`);
            } else {
                console.warn('⚠️ Missing EMAIL_USER or EMAIL_PASS. Email not sent.');
                console.log(`Fallback Link: ${verificationUrl}`);
            }
        } catch (emailErr) {
            console.error('❌ Email delivery failed:', emailErr.message);
            console.log(`Manual Verification Link for ${email}: ${verificationUrl}`);
        }

        res.status(200).json({
            message: 'Registration successful! Please check your email to verify your account.'
        });

    } catch (err) {
        console.error('Signup Error:', err);
        res.status(500).json({
            message: 'Server error during signup',
            error: err.message
        });
    }
});

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'Account is already verified' });
        }

        // Generate New Token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        user.verificationToken = verificationToken;
        await user.save();

        // Send Email
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const verificationUrl = `${frontendUrl}/verify-email/${verificationToken}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verify Your Mini-Analyst Account',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #6366f1;">Welcome back to Mini-Analyst!</h2>
                    <p>Hi ${user.fullName || user.username},</p>
                    <p>You requested a new verification link. Please click below to activate your account:</p>
                    <a href="${verificationUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">Verify Email</a>
                    <p>Or paste this link in your browser:</p>
                    <p>${verificationUrl}</p>
                </div>
            `
        };

        // Send Email (Async but with logging)
        console.log(`⏳ Attempting to resend verification email to: ${email}`);
        const mailPromise = transporter.sendMail(mailOptions);

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Email resend timed out after 10s')), 10000)
        );

        try {
            if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                await Promise.race([mailPromise, timeoutPromise]);
                console.log(`✅ Verification email successfully resent to ${email}`);
            } else {
                console.warn('⚠️ Missing EMAIL_USER or EMAIL_PASS. Email not sent.');
                console.log(`Fallback Link: ${verificationUrl}`);
            }
        } catch (emailErr) {
            console.error('❌ Email resend failed:', emailErr.message);
            console.log(`Manual Verification Link for ${email}: ${verificationUrl}`);
        }

        res.json({ message: 'Verification email resent' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/auth/verify-email/:token
// @desc    Verify account and log in
router.get('/verify-email/:token', async (req, res) => {
    try {
        const user = await User.findOne({ verificationToken: req.params.token });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        // Create JWT for auto-login
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '3d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                fullName: user.fullName
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Send reset password email
router.post('/forgot-password', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate reset token (simple random string for now)
        const resetToken = require('crypto').randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpire = Date.now() + 3600000; // 1 hour

        await user.save();

        // In a real app, send email here via nodemailer
        // For now, return the token for testing
        res.json({ message: 'Email sent', resetToken });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password
router.post('/reset-password/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/auth/login
// @desc    Login user & get token
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check for user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check verification status
        if (!user.isVerified) {
            return res.status(403).json({ message: 'Please verify your email address before logging in.' });
        }

        // Create JWT
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '3d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/auth/verify
// @desc    Verify token and return user
router.get('/verify', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

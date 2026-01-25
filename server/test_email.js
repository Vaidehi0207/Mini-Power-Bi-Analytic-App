require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('--- Email Debugger ---');
console.log('Checking environment variables...');

if (!process.env.EMAIL_USER) {
    console.error('ERROR: EMAIL_USER is missing from .env');
    process.exit(1);
}
if (!process.env.EMAIL_PASS) {
    console.error('ERROR: EMAIL_PASS is missing from .env');
    process.exit(1);
}

console.log(`Email User found: ${process.env.EMAIL_USER}`);
console.log('Password found: [HIDDEN]');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const testEmail = process.env.EMAIL_USER; // Send to self

console.log(`Attempting to send test email to ${testEmail}...`);

const mailOptions = {
    from: process.env.EMAIL_USER,
    to: testEmail,
    subject: 'Mini-Analyst Debug Email',
    text: 'If you are reading this, your email configuration is working perfectly!'
};

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.error('--- SEND FAILED ---');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        if (error.code === 'EAUTH') {
            console.error('\nPOSSIBLE CAUSES:');
            console.error('1. You used your regular Gmail password instead of an APP PASSWORD.');
            console.error('2. 2-Step Verification is not enabled on your Google Account (required for App Passwords).');
            console.error('3. You made a typo in the .env file.');
        }
    } else {
        console.log('--- SUCCESS! ---');
        console.log('Email sent: ' + info.response);
    }
});

const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

console.log('--- Email Configuration Test ---');
console.log('User:', process.env.EMAIL_USER);
console.log('Pass length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0);

const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER, // Send to self
    subject: 'SMTP Diagnostic Test',
    text: 'If you receive this, your SMTP configuration is working correctly!'
};

console.log('Attempting to send test email...');
const startTime = Date.now();

transporter.sendMail(mailOptions)
    .then(info => {
        const duration = (Date.now() - startTime) / 1000;
        console.log(`✅ Success! Email sent in ${duration}s`);
        console.log('Response:', info.response);
        process.exit(0);
    })
    .catch(err => {
        const duration = (Date.now() - startTime) / 1000;
        console.error(`❌ Failed after ${duration}s:`);
        console.error(err);
        process.exit(1);
    });

const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

async function testEmail() {
    console.log('Testing SMTP Connection...');
    const logFile = 'email_debug_log.txt';

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        debug: true // Show debug output
    });

    try {
        await transporter.verify();
        console.log('✅ Connection Successful! SMTP credentials are correct.');
        fs.writeFileSync(logFile, 'Connection Successful!');
    } catch (error) {
        console.error('❌ Connection Failed:', error);

        let errorMsg = `Error Code: ${error.code}\nMessage: ${error.message}\n`;
        if (error.response) errorMsg += `Response: ${error.response}\n`;

        fs.writeFileSync(logFile, errorMsg);

        if (error.code === 'EAUTH') {
            console.log('👉 HINT: Authentication failed. Check your email and password.');
            console.log('👉 GMAIL USERS: You MUST use an "App Password", not your login password.');
        }
    }
}

testEmail();

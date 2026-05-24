require('dotenv').config();
const nodemailer = require('nodemailer');
const mysql = require('mysql2/promise');

// Usage: node debug_email.js <target_email>
const targetEmail = process.argv[2];

if (!targetEmail) {
    console.error('❌ Lütfen bir e-posta adresi belirtin.');
    console.error('Kullanım: node debug_email.js alici@ornek.com');
    process.exit(1);
}

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

async function checkSettingsAndSend() {
    console.log('--- EMAIL DEBUG TOOL ---');
    console.log(`Target: ${targetEmail}`);

    let smtpConfig = {};

    // 1. Try DB Settings First
    try {
        console.log('1. Connecting to Database to check overrides...');
        const pool = mysql.createPool(dbConfig);
        const [rows] = await pool.query("SELECT * FROM settings WHERE setting_key LIKE 'smtp_%'");
        rows.forEach(r => smtpConfig[r.setting_key] = r.setting_value);
        console.log('   ✔ DB Settings fetch complete.');
        await pool.end();
    } catch (e) {
        console.log('   Warning: DB Connection failed, using .env only.', e.message);
    }

    // 2. Resolve Configuration (DB overwrites ENV)
    const host = smtpConfig.smtp_host || process.env.SMTP_HOST;
    const user = smtpConfig.smtp_user || process.env.SMTP_USER;
    const pass = smtpConfig.smtp_pass || process.env.SMTP_PASS;
    const port = smtpConfig.smtp_port || process.env.SMTP_PORT || 587;
    const secure = (String(smtpConfig.smtp_secure) === 'true') || (process.env.SMTP_SECURE === 'true');

    // Hide password in logs
    console.log('2. Effective Configuration:');
    console.log(`   Host: ${host}`);
    console.log(`   Port: ${port}`);
    console.log(`   User: ${user}`);
    console.log(`   Secure: ${secure}`);
    console.log(`   Pass: ${pass ? '**** (Set)' : '❌ MISSING'}`);

    if (!host || !user || !pass) {
        console.error('❌ CRITICAL: Missing SMTP configuration.');
        return;
    }

    // 3. Create Transporter
    const transporter = nodemailer.createTransport({
        host: host,
        port: parseInt(port),
        secure: secure, // true for 465, false for 587
        auth: {
            user: user,
            pass: pass
        },
        tls: {
            rejectUnauthorized: false // Sometimes helps with self-signed certs
        },
        debug: true, // Show SMTP traffic
        logger: true // Log to console
    });

    // 4. Send Mail
    console.log('3. Attempting to send email...');
    try {
        const info = await transporter.sendMail({
            from: `"Debug Tool" <${user}>`,
            to: targetEmail,
            subject: "AperionX Email Testi 🚀",
            text: "Bu bir test e-postasıdır. Eğer bunu görüyorsanız SMTP ayarlarınız çalışıyor demektir.",
            html: "<b>Bu bir test e-postasıdır.</b><br>Eğer bunu görüyorsanız SMTP ayarlarınız çalışıyor demektir."
        });

        console.log('✅ SUCCESSSS!');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Response: ${info.response}`);
    } catch (error) {
        console.error('❌ SEND FAILED:');
        console.error(error);
    }
}

checkSettingsAndSend();

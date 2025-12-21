require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

async function checkSmtp() {
    console.log('--- SMTP SETTINGS CHECK ---');
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query("SELECT * FROM settings WHERE setting_key LIKE 'smtp_%'");

        if (rows.length === 0) {
            console.log('❌ No SMTP settings found in database!');
        } else {
            console.log('✔ SMTP Settings found:');
            rows.forEach(r => {
                let val = r.setting_value;
                if (r.setting_key === 'smtp_pass') val = '****' + val.slice(-4); // Mask
                console.log(`   - ${r.setting_key}: ${val}`);
            });
        }
        await connection.end();
    } catch (e) {
        console.error('❌ DB Error:', e.message);
    }
}

checkSmtp();

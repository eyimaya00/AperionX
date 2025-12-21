const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

const email = 'emrullah@aperionx.com';
const newPassword = 'password123';

async function resetPassword() {
    try {
        const pool = mysql.createPool(dbConfig);
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);

        console.log(`Password for ${email} reset to ${newPassword}`);

        await pool.end();
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

resetPassword();

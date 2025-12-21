const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function resetPass() {
    const config = {
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'aperionx_db'
    };

    try {
        const conn = await mysql.createConnection(config);
        const hashedPassword = await bcrypt.hash('admin123', 10);

        await conn.query("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, 'admin@aperion.com']);
        console.log('Password updated for admin@aperion.com');
        await conn.end();
    } catch (e) { console.error(e); }
}

resetPass();

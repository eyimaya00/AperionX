require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'aperionx_db'
        });

        console.log('Searching for users...');
        const [rows] = await pool.query("SELECT id, username, email FROM users WHERE email LIKE '%melike%' OR username LIKE '%melike%' OR email LIKE '%sitki%' OR username LIKE '%sitki%'");
        console.log('Found Users:', rows);

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();

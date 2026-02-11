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

        const [rows] = await pool.query('SELECT id, username, email, is_subscribed FROM users LIMIT 20');
        console.log('Sample Users:', rows);

        // Count valid emails
        const [valid] = await pool.query("SELECT count(*) as c FROM users WHERE email LIKE '%@%'");
        console.log('Valid Email Count:', valid[0].c);

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();

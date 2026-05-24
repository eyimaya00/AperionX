const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function check() {
    const pool = mysql.createPool(dbConfig);
    try {
        const [rows] = await pool.query('SELECT id, fullname, username FROM users WHERE id = 63');
        console.log('User 63 Data:', rows[0]);
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
check();

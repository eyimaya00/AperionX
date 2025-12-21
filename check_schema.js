require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'aperionx_db'
    });

    try {
        const [rows] = await pool.query('DESCRIBE comments');
        console.table(rows);
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
check();

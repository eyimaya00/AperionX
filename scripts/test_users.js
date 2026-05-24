require('dotenv').config();
const mysql = require('mysql2/promise');

async function test() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'aperionx_db'
        });
        const [rows] = await pool.query('SELECT * FROM users');
        console.log("Users count:", rows.length);
        if (rows.length > 0) console.log(rows.map(u => u.username));
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
test();
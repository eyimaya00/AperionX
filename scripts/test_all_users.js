const mysql = require('mysql2/promise');
require('dotenv').config();
async function run() {
    let pool;
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'aperionx_db'
        });
        const [users] = await pool.query('SELECT id, email, username, fullname, role FROM users');
        console.table(users);
    } finally { if(pool) await pool.end(); }
}
run();

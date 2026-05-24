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
        const [articles] = await pool.query('SELECT id, title, author_id, status FROM articles LIMIT 10');
        console.table(articles);
    } finally { if(pool) await pool.end(); }
}
run();

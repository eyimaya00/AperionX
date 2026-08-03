const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'aperionx_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        const [articles] = await pool.query("SELECT id, slug, title, views FROM articles WHERE title LIKE '%NK%' OR title LIKE '%Kanser%' OR title LIKE '%Bağışıklık%' OR title LIKE '%Kaçar%'");
        console.log('Matching articles in local DB:');
        console.log(articles);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();

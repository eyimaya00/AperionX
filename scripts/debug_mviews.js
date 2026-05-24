const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function checkMonthlyViews() {
    const conn = await mysql.createConnection(dbConfig);
    try {
        console.log("Checking Admin Chart Data Logic...");

        // 1. The Query used in server.js for monthly stats
        const [mViews] = await conn.query(`
            SELECT COUNT(*) as count 
            FROM article_views v 
            JOIN articles a ON v.article_id = a.id 
            WHERE a.status = 'published' AND v.viewed_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `);
        console.log(`Monthly Stats (Filtered Local): ${mViews[0].count}`);

        // 2. Unfiltered
        const [allViews] = await conn.query(`
            SELECT COUNT(*) as count FROM article_views v 
             WHERE v.viewed_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `);
        console.log(`Monthly Stats (Unfiltered): ${allViews[0].count}`);

    } catch (e) {
        console.error(e);
    } finally {
        conn.end();
    }
}

checkMonthlyViews();

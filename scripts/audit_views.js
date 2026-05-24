const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function auditViews() {
    const conn = await mysql.createConnection(dbConfig);
    try {
        console.log("--- View Count Audit ---");

        // 1. Total Sum from DB (The 1116 number)
        const [totalRes] = await conn.query("SELECT SUM(views) as total FROM articles");
        console.log(`Total 'views' column sum (All Articles): ${totalRes[0].total}`);

        // 2. Breakdown by Status
        console.log("\n--- Breakdown by Status ---");
        const [rows] = await conn.query(`
            SELECT status, COUNT(*) as article_count, SUM(views) as total_views 
            FROM articles 
            GROUP BY status
        `);

        let calculatedTotal = 0;
        console.table(rows);

        // 3. List Non-Published Articles with Views
        console.log("\n--- Non-Published Articles with Views ---");
        const [hidden] = await conn.query(`
            SELECT id, title, status, views 
            FROM articles 
            WHERE status != 'published' AND views > 0
            ORDER BY views DESC
        `);

        if (hidden.length > 0) {
            console.table(hidden);
        } else {
            console.log("None found.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        conn.end();
    }
}

auditViews();

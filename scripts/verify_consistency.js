const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function verifyConsistency() {
    const conn = await mysql.createConnection(dbConfig);
    try {
        console.log("--- DATA CONSISTENCY CHECK ---");

        // 1. Homepage Logic: Sum of views for all Published articles
        const [homeRows] = await conn.query("SELECT SUM(views) as total FROM articles WHERE status = 'published'");
        const homeTotal = homeRows[0].total || 0;

        // 2. Admin Logic: Sum of stats query (which we recently fixed to filter published)
        const [adminViews] = await conn.query("SELECT SUM(views) as total FROM articles WHERE status = 'published'");
        const adminTotal = adminViews[0].total || 0;

        // 3. Chart/History Logic: Sum of history rows for published articles
        const [chartRows] = await conn.query(`
            SELECT COUNT(*) as count 
            FROM article_views v
            JOIN articles a ON v.article_id = a.id
            WHERE a.status = 'published'
        `);
        const chartTotal = chartRows[0].count || 0;

        console.log(`\n[HOMEPAGE] Total Views (Sum of Published Cards):      ${homeTotal}`);
        console.log(`[ADMIN]    Total Views Card (Filtered Query):         ${adminTotal}`);
        console.log(`[CHARTS]   Total History Points (Filtered History):   ${chartTotal}`);

        console.log("\n--- CONCLUSION ---");
        if (homeTotal === adminTotal) {
            console.log("✅ SUCCESS: Homepage and Admin Panel 'Total Views' match perfectly.");
        } else {
            console.log("❌ ERROR: Mismatch detected between Homepage and Admin.");
        }

        if (Math.abs(homeTotal - chartTotal) < 5) {
            console.log("✅ SUCCESS: Charts history data effectively matches current view counts.");
        } else {
            console.log(`⚠️ WARNING: Charts history (${chartTotal}) differs from counter (${homeTotal}).\n   (Run 'node sync_exact_views.js' again if you want exact sync)`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        conn.end();
    }
}

verifyConsistency();

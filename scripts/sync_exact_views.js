const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function syncExactViews() {
    const conn = await mysql.createConnection(dbConfig);
    try {
        console.log("Starting full view synchronization...");

        // 1. Get all articles with their current total view count
        const [articles] = await conn.query("SELECT id, title, views, created_at FROM articles");

        let totalInserted = 0;

        for (const art of articles) {
            // 2. Count existing history records for this article
            const [rows] = await conn.query("SELECT COUNT(*) as count FROM article_views WHERE article_id = ?", [art.id]);
            const currentHistoryCount = rows[0].count;

            // 3. Calculate deficit
            // If article says 100 views, but history has 20, we need to insert 80.
            let needed = art.views - currentHistoryCount;

            if (needed > 0) {
                console.log(`[${art.title}] View Count: ${art.views}, History: ${currentHistoryCount}. Adding ${needed} records...`);

                const viewsToInsert = [];
                const now = new Date();
                const created = new Date(art.created_at);
                const timeSpan = now.getTime() - created.getTime();

                // Generate mock records
                // Distribute them: 40% in last 7 days (trend), 60% over total lifetime
                for (let i = 0; i < needed; i++) {
                    let randomTime;

                    // Simple distribution logic to make charts look realistic
                    const weight = Math.random();
                    if (weight > 0.6) {
                        // Recent view (last 7 days)
                        randomTime = new Date(now.getTime() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));
                    } else {
                        // Lifetime view
                        randomTime = new Date(created.getTime() + Math.random() * timeSpan);
                    }

                    // Ensure we don't go before creation or after now
                    if (randomTime < created) randomTime = created;
                    if (randomTime > now) randomTime = now;

                    const timeStr = randomTime.toISOString().slice(0, 19).replace('T', ' ');
                    const ip = `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`; // Random internal-like IP

                    viewsToInsert.push([art.id, ip, timeStr]);
                }

                // Batch Insert
                const chunkSize = 1000;
                for (let i = 0; i < viewsToInsert.length; i += chunkSize) {
                    const chunk = viewsToInsert.slice(i, i + chunkSize);
                    await conn.query('INSERT INTO article_views (article_id, ip_address, viewed_at) VALUES ?', [chunk]);
                    totalInserted += chunk.length;
                }
            } else {
                console.log(`[${art.title}] Sync OK. (Views: ${art.views}, History: ${currentHistoryCount})`);
            }
        }

        console.log(`\nSynchronization Complete. Total new view records created: ${totalInserted}`);

    } catch (e) {
        console.error('Error syncing exact views:', e);
    } finally {
        conn.end();
    }
}

syncExactViews();

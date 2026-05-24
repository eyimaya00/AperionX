const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function syncHistory() {
    const conn = await mysql.createConnection(dbConfig);
    try {
        // 1. Get all published articles
        const [articles] = await conn.query("SELECT id FROM articles WHERE status = 'published'");
        console.log(`Found ${articles.length} published articles.`);

        // 2. Insert 20 fake view records for each
        const viewsToInsert = [];
        const now = new Date();

        for (const art of articles) {
            for (let i = 0; i < 20; i++) {
                // Random time in last 24 hours
                const timeStr = new Date(now.getTime() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)).toISOString().slice(0, 19).replace('T', ' ');
                // Random IP 
                const ip = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
                viewsToInsert.push([art.id, ip, timeStr]);
            }
        }

        if (viewsToInsert.length > 0) {
            // Helper to chunk inserts if too many
            const chunkSize = 1000;
            for (let i = 0; i < viewsToInsert.length; i += chunkSize) {
                const chunk = viewsToInsert.slice(i, i + chunkSize);
                await conn.query('INSERT INTO article_views (article_id, ip_address, viewed_at) VALUES ?', [chunk]);
                console.log(`Inserted ${chunk.length} view records...`);
            }
            console.log('Successfully synchronized view history.');
        } else {
            console.log('No views to insert.');
        }

    } catch (e) {
        console.error('Error syncing history:', e);
    } finally {
        conn.end();
    }
}

syncHistory();

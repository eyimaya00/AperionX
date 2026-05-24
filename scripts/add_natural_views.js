require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

// Generate random IP
function randomIP() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

// Generate random timestamp within last 24 hours
function randomTimestamp() {
    const now = new Date();
    const hoursAgo = Math.floor(Math.random() * 24); // 0-24 hours ago
    const minutesAgo = Math.floor(Math.random() * 60);
    const secondsAgo = Math.floor(Math.random() * 60);

    const timestamp = new Date(now);
    timestamp.setHours(timestamp.getHours() - hoursAgo);
    timestamp.setMinutes(timestamp.getMinutes() - minutesAgo);
    timestamp.setSeconds(timestamp.getSeconds() - secondsAgo);

    return timestamp.toISOString().slice(0, 19).replace('T', ' ');
}

async function addNaturalViews() {
    const conn = await mysql.createConnection(dbConfig);

    try {
        console.log('\n🚀 Adding natural-looking views to published articles...\n');

        // Get all published articles
        const [articles] = await conn.query("SELECT id, title FROM articles WHERE status = 'published'");

        console.log(`Found ${articles.length} published articles\n`);

        for (const article of articles) {
            // Random views between 45-55 (average 50)
            const viewCount = Math.floor(Math.random() * 11) + 45; // 45-55

            console.log(`📊 Adding ${viewCount} views to: "${article.title}"`);

            // Update article views count
            await conn.query('UPDATE articles SET views = views + ? WHERE id = ?', [viewCount, article.id]);

            // Add individual view records with random IPs and timestamps
            for (let i = 0; i < viewCount; i++) {
                const ip = randomIP();
                const timestamp = randomTimestamp();

                await conn.query(
                    'INSERT INTO article_views (article_id, ip_address, viewed_at) VALUES (?, ?, ?)',
                    [article.id, ip, timestamp]
                );
            }
        }

        console.log('\n✅ Successfully added natural-looking views to all published articles!');
        console.log('   - Views distributed over last 24 hours');
        console.log('   - Random IPs for each view');
        console.log('   - View counts vary between 45-55 per article\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await conn.end();
    }
}

addNaturalViews();

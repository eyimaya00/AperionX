const mysql = require('mysql2/promise');

async function testSitemap() {
    try {
        const pool = mysql.createPool({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'aperionx_db'
        });

        console.log("Testing sitemap query...");
        const [articles] = await pool.query("SELECT slug, created_at FROM articles WHERE status = 'published' ORDER BY created_at DESC");
        console.log(`Found ${articles.length} published articles.`);

        if (articles.length > 0) {
            console.log("Sample:", articles[0]);
            console.log("Date:", new Date(articles[0].created_at).toISOString());
        }

        process.exit();
    } catch (e) {
        console.error("Sitemap Test Error:", e);
        process.exit(1);
    }
}
testSitemap();

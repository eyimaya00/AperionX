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
        // Select all articles
        const [articles] = await pool.query('SELECT id, slug, title, views FROM articles ORDER BY views DESC LIMIT 10');
        console.log('Top 10 articles by views in DB:');
        console.log(articles);
        
        if (articles.length === 0) {
            console.log('No articles found in DB.');
            return;
        }
        const article = articles[0]; // Take top one as a placeholder or we can print them first
        console.log(`Analyzing the most viewed article: ID=${article.id}, Slug=${article.slug}`);

        // Total views recorded in article_views table
        const [totalViews] = await pool.query('SELECT COUNT(*) as count FROM article_views WHERE article_id = ?', [article.id]);
        console.log(`Total views recorded in article_views table: ${totalViews[0].count}`);

        // View count group by IP (top 15)
        console.log('\nTop 15 IP Addresses viewing this article:');
        const [topIPs] = await pool.query(`
            SELECT ip_address, COUNT(*) as count, MIN(viewed_at) as first_view, MAX(viewed_at) as last_view 
            FROM article_views 
            WHERE article_id = ? 
            GROUP BY ip_address 
            ORDER BY count DESC 
            LIMIT 15
        `, [article.id]);
        console.table(topIPs);

        // Recent 10 views
        console.log('\nRecent 10 views:');
        const [recentViews] = await pool.query(`
            SELECT ip_address, viewed_at 
            FROM article_views 
            WHERE article_id = ? 
            ORDER BY viewed_at DESC 
            LIMIT 10
        `, [article.id]);
        console.table(recentViews);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();

const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    console.log('=== View Count Durumu ===\n');

    // Top 5 makaleler
    const [articles] = await pool.query('SELECT id, title, views FROM articles ORDER BY views DESC LIMIT 5');
    console.log('En Çok Görüntülenen Makaleler:');
    articles.forEach(a => console.log(`  ID: ${a.id} | Views: ${a.views} | ${a.title.substring(0, 40)}...`));

    // Son view kayıtları
    const [recent] = await pool.query('SELECT * FROM article_views ORDER BY viewed_at DESC LIMIT 10');
    console.log('\n\nSon 10 View Kaydı:');
    recent.forEach(v => console.log(`  Article ID: ${v.article_id} | IP: ${v.ip_address} | Tarih: ${v.viewed_at}`));

    // Bugünkü toplam view
    const [[todayCount]] = await pool.query("SELECT COUNT(*) as cnt FROM article_views WHERE DATE(viewed_at) = CURDATE()");
    console.log(`\n\nBugünkü Toplam View: ${todayCount.cnt}`);

    pool.end();
})();

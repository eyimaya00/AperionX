const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function fixViewCounts() {
    const conn = await mysql.createConnection(dbConfig);
    try {
        console.log("=== VIEW COUNT SYNC TOOL ===\n");

        // 1. Show current state
        const [articles] = await conn.query(
            "SELECT id, title, views FROM articles WHERE status = 'published' ORDER BY views DESC"
        );

        // 2. Count actual unique views from article_views table
        const [actualViews] = await conn.query(
            "SELECT article_id, COUNT(*) as real_count FROM article_views GROUP BY article_id"
        );

        const viewMap = {};
        actualViews.forEach(v => viewMap[v.article_id] = v.real_count);

        console.log("Makale | Mevcut Sayı | article_views Kaydı | Fark");
        console.log("-".repeat(70));

        let fixCount = 0;

        for (const art of articles) {
            const realCount = viewMap[art.id] || 0;
            const diff = realCount - art.views;
            const marker = diff !== 0 ? " ⚠️" : " ✅";
            console.log(`${art.title.substring(0, 30).padEnd(30)} | ${String(art.views).padStart(8)} | ${String(realCount).padStart(12)} | ${diff > 0 ? '+' : ''}${diff}${marker}`);

            // If article_views has MORE records than articles.views, update to the higher number
            if (realCount > art.views) {
                await conn.query("UPDATE articles SET views = ? WHERE id = ?", [realCount, art.id]);
                fixCount++;
                console.log(`   → Güncellendi: ${art.views} → ${realCount}`);
            }
        }

        console.log(`\n=== Sonuç: ${fixCount} makale güncellendi ===`);

        // 3. Show total
        const [total] = await conn.query("SELECT SUM(views) as total FROM articles WHERE status = 'published'");
        const [totalHistory] = await conn.query("SELECT COUNT(*) as total FROM article_views");
        console.log(`\nToplam views (articles): ${total[0].total}`);
        console.log(`Toplam kayıt (article_views): ${totalHistory[0].total}`);

    } catch (e) {
        console.error('Hata:', e);
    } finally {
        conn.end();
    }
}

fixViewCounts();

const pool = require('../config/db');

async function test() {
    try {
        const month = 12; // Test December
        const year = 2025; // Test 2025
        const limit = 10;

        const startDate = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
        let nextMonth = month + 1;
        let nextYear = year;
        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear += 1;
        }
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01 00:00:00`;

        console.log(`Querying top articles from ${startDate} to ${endDate}...`);

        const query = `
            SELECT a.id, a.title, a.slug, COUNT(v.id) as view_count, u.fullname as author_name
            FROM article_views v
            JOIN articles a ON v.article_id = a.id
            LEFT JOIN users u ON a.author_id = u.id
            WHERE v.viewed_at >= ? AND v.viewed_at < ?
            GROUP BY a.id, a.title, a.slug, u.fullname
            ORDER BY view_count DESC
            LIMIT ?
        `;

        const [rows] = await pool.query(query, [startDate, endDate, limit]);
        console.log("Success! Rows found:", rows.length);
        console.log(rows);
    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        await pool.end();
    }
}

test();

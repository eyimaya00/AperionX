const pool = require('../config/db');

async function test() {
    try {
        const userId = 25;
        console.log("Running user comments query for user 25:");
        const [rows] = await pool.query(`
            SELECT c.id, c.content, c.is_approved, c.created_at, c.article_id, a.title as article_title,
                   c.experiment_id, e.title as experiment_title, e.slug as experiment_slug
            FROM comments c
            LEFT JOIN articles a ON c.article_id = a.id
            LEFT JOIN experiments e ON c.experiment_id = e.id
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC
        `, [userId]);
        console.log("Rows returned:", rows.length);
        console.log(rows);
    } catch (e) {
        console.error("Error occurred:", e);
    } finally {
        await pool.end();
    }
}

test();

const pool = require('../config/db');

async function run() {
    try {
        const [users] = await pool.query('SELECT username FROM users LIMIT 5');
        console.log('Sample users:', users);

        for (const u of users) {
            const username = u.username;
            if (!username) continue;

            console.log(`\nTesting user: ${username}`);
            // Simulate the endpoint logic
            let sql = 'SELECT id, fullname, username, bio, job_title, avatar_url, created_at FROM users WHERE username = ?';
            const [matchedUsers] = await pool.query(sql, [username]);
            if (matchedUsers.length === 0) {
                console.log(`User ${username} not found in DB.`);
                continue;
            }
            const user = matchedUsers[0];

            const [articles] = await pool.query(`
                SELECT DISTINCT a.id, a.title, a.slug, a.excerpt, a.image_url, a.category, a.created_at
                FROM articles a
                LEFT JOIN article_authors aa ON a.id = aa.article_id
                WHERE (a.author_id = ? OR aa.user_id = ?) AND a.status = 'published'
                ORDER BY a.created_at DESC
            `, [user.id, user.id]);

            const [experiments] = await pool.query(`
                SELECT DISTINCT e.id, e.title, e.slug, e.excerpt, e.image_url, e.category, e.created_at
                FROM experiments e
                LEFT JOIN experiment_authors ea ON e.id = ea.experiment_id
                WHERE (e.author_id = ? OR ea.user_id = ?) AND e.status = 'published' AND e.deleted_at IS NULL
                ORDER BY e.created_at DESC
            `, [user.id, user.id]);

            console.log(`Result: articles count = ${articles.length}, experiments count = ${experiments.length}`);
        }
    } catch (err) {
        console.error('Error during test:', err);
    } finally {
        await pool.end();
    }
}

run();

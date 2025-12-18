const mysql = require('mysql2/promise');
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function checkLiked() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [users] = await connection.execute("SELECT id FROM users LIMIT 1"); // Get any user
        if (users.length === 0) { console.log('No users'); return; }
        const userId = users[0].id;

        // Output the user ID being tested
        console.log('Testing User ID:', userId);

        const [rows] = await connection.query(`
            SELECT a.*, l.created_at as liked_at 
            FROM articles a 
            JOIN likes l ON a.id = l.article_id 
            WHERE l.user_id = ? 
            ORDER BY l.created_at DESC`, [userId]);

        console.log('Row count:', rows.length);
        if (rows.length > 0) {
            console.log('First row keys:', Object.keys(rows[0]));
            console.log('First row title:', rows[0].title);
        } else {
            console.log('No liked articles for this user.');
            // Try to add a like
            const [arts] = await connection.execute("SELECT id FROM articles LIMIT 1");
            if (arts.length > 0) {
                await connection.execute("INSERT IGNORE INTO likes (user_id, article_id) VALUES (?, ?)", [userId, arts[0].id]);
                console.log('Added test like. Run again.');
            }
        }
        await connection.end();
    } catch (e) {
        console.error(e);
    }
}
checkLiked();

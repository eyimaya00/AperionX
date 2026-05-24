const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function addTestComment() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'aperionx_db'
        });

        // Get test user
        const [users] = await connection.execute("SELECT id FROM users WHERE email = 'testauthor_1765220254926@test.com'");
        if (users.length === 0) {
            console.log('Test user not found.');
            process.exit(1);
        }
        const userId = users[0].id;

        // Get an article
        const [articles] = await connection.execute("SELECT id FROM articles LIMIT 1");
        if (articles.length === 0) {
            console.log('No articles found to comment on.');
            process.exit(1);
        }
        const articleId = articles[0].id;

        // Add comment (approved=0 to check if it displays as Yayında)
        await connection.execute("INSERT INTO comments (article_id, user_id, content, is_approved) VALUES (?, ?, 'Bu bir modal test yorumudur.', 0)", [articleId, userId]);
        console.log('Test comment added.');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

addTestComment();

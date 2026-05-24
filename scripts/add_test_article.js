const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function addArticle() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        // Find the author ID
        const [users] = await connection.query('SELECT id FROM users WHERE email = ?', ['testauthor_1765220254926@test.com']);
        if (users.length === 0) {
            console.log('User not found');
            return;
        }
        const authorId = users[0].id;

        await connection.query(`
            INSERT INTO articles (title, content, author_id, status, category, excerpt, views)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            'Test Makale',
            '<p>Bu bir test makalesidir.</p>',
            authorId,
            'published',
            'Teknoloji',
            'Kısa özet...',
            100
        ]);

        console.log('Test article added for user ID:', authorId);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

addArticle();

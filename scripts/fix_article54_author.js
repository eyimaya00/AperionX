const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function fixArticle54() {
    try {
        const connection = await mysql.createConnection(dbConfig);

        // Find article with title like "Sentetik Embriyolar"
        const [articles] = await connection.query("SELECT id, title, author_id FROM articles WHERE title LIKE '%Sentetik Embriyolar%'");

        if (articles.length === 0) {
            console.log('No article found with "Sentetik Embriyolar" in title.');
            await connection.end();
            return;
        }

        const article = articles[0];
        console.log(`Found Article: ID=${article.id}, Title="${article.title}", Current author_id=${article.author_id}`);

        // Find Yaren
        const [yarenUsers] = await connection.query("SELECT id, fullname FROM users WHERE fullname LIKE '%Yaren%'");
        if (yarenUsers.length === 0) {
            console.log('No user found with "Yaren" in fullname.');
            await connection.end();
            return;
        }

        const yaren = yarenUsers[0];
        console.log(`Found Yaren: ID=${yaren.id}, Name="${yaren.fullname}"`);

        // Update article_authors: Remove wrong entry, add correct one
        await connection.query("DELETE FROM article_authors WHERE article_id = ?", [article.id]);
        await connection.query("INSERT INTO article_authors (article_id, user_id, order_index) VALUES (?, ?, 0)", [article.id, yaren.id]);

        // Also update legacy author_id
        await connection.query("UPDATE articles SET author_id = ? WHERE id = ?", [yaren.id, article.id]);

        console.log(`✅ Fixed! Article "${article.title}" now assigned to "${yaren.fullname}" (ID: ${yaren.id})`);

        await connection.end();
    } catch (e) {
        console.error('Error:', e);
    }
}

fixArticle54();

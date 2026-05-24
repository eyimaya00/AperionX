const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function findAuthor() {
    const pool = mysql.createPool(dbConfig);
    try {
        console.log('Checking Article 41...');
        const [rows] = await pool.query('SELECT id, title, author_id FROM articles WHERE id = 41');
        if (rows.length > 0) {
            console.log('Article 41 Author ID:', rows[0].author_id);
            // Get user details for this author
            const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [rows[0].author_id]);
            console.log('Author Details:', user);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

findAuthor();

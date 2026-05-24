const mysql = require('mysql2/promise');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function dumpArticles() {
    const pool = mysql.createPool(dbConfig);
    try {
        const [rows] = await pool.query("SELECT id, title, author_id FROM articles");
        fs.writeFileSync('all_articles.json', JSON.stringify(rows, null, 2));
        console.log('Dumped to all_articles.json');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

dumpArticles();

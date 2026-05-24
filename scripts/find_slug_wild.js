const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function findSlugWildcard() {
    const pool = mysql.createPool(dbConfig);
    try {
        console.log('Searching for slug like %neuro%...');
        const [rows] = await pool.query("SELECT id, title, slug, author_id FROM articles WHERE slug LIKE '%neuro%'");
        console.log('Results:', rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

findSlugWildcard();

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function listAllArticles() {
    const pool = mysql.createPool(dbConfig);
    try {
        const [rows] = await pool.query(`
            SELECT a.id, a.title, a.author_id, u.fullname, u.avatar_url 
            FROM articles a 
            LEFT JOIN users u ON a.author_id = u.id 
        `);
        console.log('All Articles:', rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

listAllArticles();

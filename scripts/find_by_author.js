const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function findByAuthor() {
    const pool = mysql.createPool(dbConfig);
    try {
        console.log('Searching articles for Author IDs 10, 29, 38...');
        const [rows] = await pool.query(`
            SELECT id, title, author_id, status 
            FROM articles 
            WHERE author_id IN (10, 29, 38)
        `);
        console.log('Articles by Yasin:', rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

findByAuthor();

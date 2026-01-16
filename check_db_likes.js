const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function checkLikes() {
    const pool = mysql.createPool(dbConfig);
    try {
        console.log('Checking LIKES table...');
        const [rows] = await pool.query('SELECT * FROM likes LIMIT 5');
        console.log('Likes Count (Limit 5):', rows.length);
        console.log('Sample Data:', rows);

        console.log('Checking Articles for Author ID 2...');
        const [arts] = await pool.query('SELECT id, title FROM articles WHERE author_id = 2');
        console.log('Articles for ID 2:', arts);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkLikes();

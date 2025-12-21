const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function checkTables() {
    try {
        const pool = mysql.createPool(dbConfig);
        const [rows] = await pool.query('SHOW TABLES');
        console.log('Tables:', rows);

        // Also check if 'likes' and 'comments' exist specifically
        const tables = rows.map(r => Object.values(r)[0]);
        console.log('Likes table exists:', tables.includes('likes'));
        console.log('Comments table exists:', tables.includes('comments'));

        await pool.end();
    } catch (e) {
        console.error('Error:', e);
    }
}

checkTables();

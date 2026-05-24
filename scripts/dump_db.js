const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function dumpDB() {
    const pool = mysql.createPool(dbConfig);
    try {
        console.log('--- ALL USERS ---');
        const [users] = await pool.query("SELECT id, fullname, avatar_url FROM users");
        console.log(users);

        console.log('--- RECENT 20 ARTICLES ---');
        const [articles] = await pool.query("SELECT id, title, author_id FROM articles ORDER BY id DESC LIMIT 20");
        console.log(articles);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

dumpDB();

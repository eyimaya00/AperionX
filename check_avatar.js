const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function checkUserAvatar() {
    const pool = mysql.createPool(dbConfig);
    try {
        const [rows] = await pool.query("SELECT id, fullname, email, avatar_url FROM users WHERE fullname LIKE '%Yasin Eyimaya%'");
        console.log('User Data:', rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkUserAvatar();

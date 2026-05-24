require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkAuthors() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await pool.query("SELECT id, fullname, role FROM users WHERE role = 'author'");
        console.log('Authors in DB:', rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

checkAuthors();

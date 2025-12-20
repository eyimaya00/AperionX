require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

(async () => {
    try {
        const conn = await mysql.createConnection(dbConfig);
        console.log('Connected to DB.');

        // 1. Check Schema
        const [cols] = await conn.query("SHOW COLUMNS FROM users");
        console.log('Columns:', cols.map(c => c.Field).join(', '));

        // 2. Check User
        const [rows] = await conn.query("SELECT id, fullname, email, username, role FROM users");
        console.log('Users found:', rows.length);
        console.table(rows);

        await conn.end();
    } catch (e) {
        console.error(e);
    }
})();

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsers() {
    const config = {
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'aperionx_db'
    };

    try {
        const conn = await mysql.createConnection(config);
        const [rows] = await conn.query("SELECT id, email, role FROM users");
        console.log('--- USERS ---');
        console.table(rows);
        await conn.end();
    } catch (e) { console.error(e); }
}

checkUsers();

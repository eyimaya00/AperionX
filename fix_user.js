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
        console.log('Connected.');

        // 1. Fix the user 'a1@apeiron.com' (ID 38) to have username 'yaso12'
        const [res] = await conn.query("UPDATE users SET username = 'yaso12' WHERE id = 38");
        console.log('Update Result:', res.info);

        // 2. Verify: Check if it's there
        const [rows] = await conn.query("SELECT * FROM users WHERE id = 38");
        console.log('Updated User:', rows[0].username, rows[0].email);

        await conn.end();
    } catch (e) { console.error(e); }
})();

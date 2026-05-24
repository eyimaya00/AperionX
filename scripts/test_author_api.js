const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function testApi() {
    let pool;
    try {
        pool = mysql.createPool(dbConfig);
        const [users] = await pool.query("SELECT id, username, role FROM users WHERE role = 'author' LIMIT 1");
        if (users.length === 0) {
            console.log("No authors");
            return;
        }
        const user = users[0];
        console.log("Testing with user:", user);

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'gizli_anahtar',
            { expiresIn: '24h' }
        );

        const res = await fetch('http://localhost:3000/api/author/stats', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Body:", text);

    } catch(e) {
        console.error(e);
    } finally {
        if(pool) await pool.end();
    }
}
testApi();

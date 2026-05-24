const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    let pool;
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'aperionx_db'
        });
        const [users] = await pool.query("SELECT * FROM users WHERE role = 'author' AND fullname != '' LIMIT 1");
        if (users.length === 0) {
            console.log("No valid authors found for test.");
            return;
        }
        const user = users[0];
        console.log("Testing with user:", user.email);

        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'gizli_anahtar',
            { expiresIn: '24h' }
        );

        // Fetch /api/me using global fetch
        const res = await fetch('http://localhost:3000/api/me', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        console.log("Status:", res.status);
        const data = await res.json();
        console.log("Response data:", data);

    } catch(e) {
        console.error(e);
    } finally {
        if(pool) await pool.end();
    }
}
run();

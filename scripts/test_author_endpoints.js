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
        const [users] = await pool.query("SELECT * FROM users WHERE role = 'author' LIMIT 1");
        if (users.length === 0) return;
        const user = users[0];

        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'gizli_anahtar',
            { expiresIn: '24h' }
        );

        const statsRes = await fetch('http://localhost:3000/api/author/stats', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        console.log("Stats Status:", statsRes.status);
        const statsData = await statsRes.text();
        console.log("Stats Data:", statsData);

        const articlesRes = await fetch('http://localhost:3000/api/author/articles', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        console.log("Articles Status:", articlesRes.status);
        const articlesData = await articlesRes.text();
        console.log("Articles Data:", articlesData.substring(0, 200));

    } catch(e) {
        console.error(e);
    } finally {
        if(pool) await pool.end();
    }
}
run();

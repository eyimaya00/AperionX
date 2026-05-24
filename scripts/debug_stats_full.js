const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
// Native fetch in Node 18+

async function run() {
    // 1. Database Setup
    const dbConfig = {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'aperionx_db'
    };

    // Create temp user
    const email = 'temp_debug_editor_' + Date.now() + '@test.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const pool = mysql.createPool(dbConfig);
        await pool.query('INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, ?)',
            ['Debug Editor', email, hashedPassword, 'editor']);
        console.log('Created temp editor:', email);
        await pool.end();
    } catch (e) {
        console.error('DB Error:', e);
        return;
    }

    // 2. Login via API
    try {
        const loginRes = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!loginRes.ok) {
            console.error('Login failed:', await loginRes.text());
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('Login successful.');

        // 3. Fetch Stats
        const statsRes = await fetch('http://localhost:3000/api/editor/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!statsRes.ok) {
            console.error('Stats fetch failed:', await statsRes.text());
            return;
        }

        const stats = await statsRes.json();
        console.log('Stats Response Keys:', Object.keys(stats));

        if (stats.articles) {
            console.log('ARTICLES ARRAY PRESENT. Length:', stats.articles.length);
            if (stats.articles.length > 0) {
                console.log('First article sample:', stats.articles[0]);
            } else {
                console.log('Articles array is empty (no articles in DB for stats view?)');
            }
        } else {
            console.error('CRITICAL: "articles" key is MISSING in response!');
        }

    } catch (e) {
        console.error('Test error:', e);
    }
}

run();

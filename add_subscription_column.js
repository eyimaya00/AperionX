require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'aperionx_db'
    });

    try {
        console.log('Checking for is_subscribed column...');
        const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'is_subscribed'");

        if (columns.length === 0) {
            console.log('Adding is_subscribed column...');
            await pool.query("ALTER TABLE users ADD COLUMN is_subscribed TINYINT(1) DEFAULT 1");
            console.log('Column added successfully.');
        } else {
            console.log('Column already exists.');
        }

    } catch (e) {
        console.error('Migration Error:', e);
    } finally {
        pool.end();
    }
}

migrate();

require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'aperionx_db'
        });

        const [rows] = await pool.query('SELECT count(*) as count, is_subscribed FROM users GROUP BY is_subscribed');
        console.log('Subscriber Counts:', rows);

        // Check if there are any users at all
        const [users] = await pool.query('SELECT count(*) as total FROM users');
        console.log('Total Users:', users[0].total);

        // If is_subscribed is NULL for many, we should fix it
        const [nulls] = await pool.query('SELECT count(*) as null_count FROM users WHERE is_subscribed IS NULL');
        console.log('NULL is_subscribed:', nulls[0].null_count);

        if (nulls[0].null_count > 0) {
            console.log('Fixing NULL subscriptions...');
            await pool.query('UPDATE users SET is_subscribed = 1 WHERE is_subscribed IS NULL');
            console.log('Fixed.');
        }

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();

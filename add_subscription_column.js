
const mysql = require('mysql2/promise');
require('dotenv').config();

async function addSubscriptionColumn() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS || process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('--- Adding is_subscribed column ---');

        // Check if column exists
        const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'is_subscribed'");

        if (columns.length === 0) {
            await pool.query("ALTER TABLE users ADD COLUMN is_subscribed BOOLEAN DEFAULT TRUE");
            console.log('✅ Column is_subscribed added successfully.');
        } else {
            console.log('ℹ️ Column is_subscribed already exists.');
        }

    } catch (e) {
        console.error('❌ Migration Failed:', e.message);
    } finally {
        pool.end();
    }
}

addSubscriptionColumn();

require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'aperionx_db'
    });

    try {
        console.log('Checking comments table...');
        const [cols] = await pool.query("SHOW COLUMNS FROM comments LIKE 'is_approved'");
        if (cols.length === 0) {
            console.log('Adding is_approved column...');
            await pool.query("ALTER TABLE comments ADD COLUMN is_approved TINYINT(1) DEFAULT 0");
            console.log('Column added.');
        } else {
            console.log('is_approved column already exists.');
        }
    } catch (e) {
        console.error('Migration Error:', e.message);
    }
    process.exit();
}
migrate();

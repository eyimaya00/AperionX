const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDB() {
    console.log('Connecting to DB...');
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'aperionx_db'
    });

    try {
        console.log('Creating table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS newsletter_subscribers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('SUCCESS: newsletter_subscribers table created.');

        // Verify
        const [rows] = await pool.query("SHOW TABLES LIKE 'newsletter_subscribers'");
        if (rows.length > 0) {
            console.log('VERIFIED: Table exists.');
        } else {
            console.error('ERROR: Table verification failed.');
        }

    } catch (e) {
        console.error('DB Error:', e);
    } finally {
        await pool.end();
    }
}

initDB();

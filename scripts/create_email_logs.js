
const mysql = require('mysql2/promise');
require('dotenv').config();

async function createEmailLogsTable() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS || process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Creating email_logs table...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS email_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                article_id INT,
                subject VARCHAR(255) NOT NULL,
                recipient_count INT DEFAULT 0,
                status ENUM('sent', 'failed') DEFAULT 'sent',
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                error_message TEXT
            )
        `);

        console.log('✅ Table email_logs created or already exists.');
    } catch (e) {
        console.error('❌ Error creating table:', e);
    } finally {
        pool.end();
    }
}

createEmailLogsTable();

require('dotenv').config();
const mysql = require('mysql2/promise');

async function createTable() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'aperionx_db'
        });

        const createQuery = `
            CREATE TABLE IF NOT EXISTS email_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                article_id INT NOT NULL,
                subject VARCHAR(255) NOT NULL,
                recipient_count INT DEFAULT 0,
                status ENUM('sent', 'failed', 'partial') DEFAULT 'sent',
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
            )
        `;

        await pool.query(createQuery);
        console.log('✅ email_logs table created successfully.');
        process.exit();
    } catch (e) {
        console.error('❌ Error creating table:', e);
        process.exit(1);
    }
}

createTable();

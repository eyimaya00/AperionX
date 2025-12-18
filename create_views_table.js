const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function createViewsTable() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS article_views (
                id INT AUTO_INCREMENT PRIMARY KEY,
                article_id INT NOT NULL,
                ip_address VARCHAR(45) NOT NULL,
                viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
            )
        `);
        console.log('Table `article_views` created or already exists.');

        // Index for performance
        await connection.query(`
            CREATE INDEX IF NOT EXISTS idx_article_ip_time ON article_views(article_id, ip_address, viewed_at);
        `);
        console.log('Index created.');

        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

createViewsTable();

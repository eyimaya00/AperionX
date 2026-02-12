const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function migrate() {
    let connection;
    try {
        // Create connection
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // 1. Create article_authors table
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS article_authors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                article_id INT NOT NULL,
                user_id INT NOT NULL,
                order_index INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_author (article_id, user_id),
                FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `;
        await connection.execute(createTableQuery);
        console.log('Table `article_authors` created (or already exists).');

        // 2. Migrate existing authors
        // Select all articles that have an author_id
        const [articles] = await connection.execute('SELECT id, author_id FROM articles WHERE author_id IS NOT NULL');
        console.log(`Found ${articles.length} articles to check for migration.`);

        let migratedCount = 0;
        for (const article of articles) {
            // Check if already exists in article_authors
            const [exists] = await connection.execute(
                'SELECT id FROM article_authors WHERE article_id = ? AND user_id = ?',
                [article.id, article.author_id]
            );

            if (exists.length === 0) {
                await connection.execute(
                    'INSERT INTO article_authors (article_id, user_id, order_index) VALUES (?, ?, ?)',
                    [article.id, article.author_id, 0]
                );
                migratedCount++;
            }
        }

        console.log(`Migration completed. ${migratedCount} new records inserted into article_authors.`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();

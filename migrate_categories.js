const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function migrateCategories() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to DB.');

        // 1. Get unique categories from articles
        const [rows] = await connection.query('SELECT DISTINCT category FROM articles WHERE category IS NOT NULL AND category != ""');
        const uniqueCategories = rows.map(r => r.category);
        console.log('Found categories:', uniqueCategories);

        if (uniqueCategories.length === 0) {
            console.log('No categories found to migrate.');
            return;
        }

        // 2. Insert into categories table (ignore duplicates)
        for (const cat of uniqueCategories) {
            try {
                // Using INSERT IGNORE or checking existence first
                const [exists] = await connection.query('SELECT id FROM categories WHERE name = ?', [cat]);
                if (exists.length === 0) {
                    await connection.query('INSERT INTO categories (name) VALUES (?)', [cat]);
                    console.log(`Inserted: ${cat}`);
                } else {
                    console.log(`Skipped (Exists): ${cat}`);
                }
            } catch (innerErr) {
                console.error(`Error inserting ${cat}:`, innerErr.message);
            }
        }

        console.log('Migration completed.');

    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        if (connection) await connection.end();
    }
}

migrateCategories();

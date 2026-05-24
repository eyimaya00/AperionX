const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db',
    multipleStatements: true
};

async function updateDatabase() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);

        console.log('Updating users table role enum...');
        // Modify ENUM to include 'author'. Note: This might rebuild the table depending on MySQL version, but is necessary.
        await connection.query(`
            ALTER TABLE users 
            MODIFY COLUMN role ENUM('user', 'admin', 'author') DEFAULT 'user'
        `);

        console.log('Adding author_id to articles table...');
        // Check if column exists first to avoid error? Or just try-catch?
        // Simpler to just run ADD COLUMN IF NOT EXISTS logic using a specialized query or just try/catch generic error.
        // MySQL 8.0+ supports IF NOT EXISTS in ADD COLUMN, but older versions don't.
        // We will try to add it, if it fails it might already exist.

        try {
            await connection.query(`
                ALTER TABLE articles
                ADD COLUMN author_id INT,
                ADD FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
            `);
            console.log('Column author_id added successfully.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('Column author_id already exists.');
            } else {
                throw err;
            }
        }

        console.log('Database update completed successfully!');

    } catch (error) {
        console.error('Error updating database:', error);
    } finally {
        if (connection) await connection.end();
    }
}

updateDatabase();

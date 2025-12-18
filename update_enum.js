const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function updateEnum() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Modify status column to include 'trash'
        // Note: We must include all existing values + new one
        await connection.query("ALTER TABLE articles MODIFY COLUMN status ENUM('draft', 'published', 'archived', 'trash') DEFAULT 'draft'");
        console.log("Updated 'status' enum to include 'trash'.");

    } catch (error) {
        console.error('Database error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

updateEnum();

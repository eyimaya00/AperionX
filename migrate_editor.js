const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        console.log("Updating users table role enum...");
        await connection.query("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'author', 'editor') DEFAULT 'user'");

        console.log("Updating articles table status enum...");
        await connection.query("ALTER TABLE articles MODIFY COLUMN status ENUM('draft', 'published', 'archived', 'trash', 'pending', 'rejected') DEFAULT 'draft'");

        console.log("Migration complete.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        if (connection) connection.end();
    }
}

migrate();

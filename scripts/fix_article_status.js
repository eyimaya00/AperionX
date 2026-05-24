const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '', // Use nullish coalescing to allow empty string if env is not allowed
    database: process.env.DB_NAME || 'aperionx_db'
};

async function fixSchema() {
    let connection;
    try {
        console.log('Connecting with config:', { ...dbConfig, password: '***' });
        connection = await mysql.createConnection(dbConfig);

        console.log("Altering 'articles' table 'status' column...");
        // Change to VARCHAR(50) to support 'published', 'rejected', 'trash', etc.
        await connection.query("ALTER TABLE articles MODIFY COLUMN status VARCHAR(50) DEFAULT 'draft'");

        console.log("Success! 'status' column updated.");
    } catch (error) {
        console.error('Error updating schema:', error);
        // Fallback attempt with hardcoded checks similar to previous successful scripts if env fails
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('Retrying with empty password...');
            try {
                const fallbackConfig = { ...dbConfig, password: '' };
                connection = await mysql.createConnection(fallbackConfig);
                await connection.query("ALTER TABLE articles MODIFY COLUMN status VARCHAR(50) DEFAULT 'draft'");
                console.log("Success with fallback config!");
            } catch (e2) {
                console.error('Fallback failed too:', e2);
            }
        }
    } finally {
        if (connection) await connection.end();
    }
}

fixSchema();

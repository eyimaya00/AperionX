const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixStatus() {
    console.log("Attempting to fix articles.status column...");

    // Try connecting with env vars, fallback to default local config
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'aperionx_db'
    };

    console.log(`Connecting to ${config.host} as ${config.user} to DB ${config.database}...`);

    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log("Connected.");

        // Check current column type
        const [cols] = await connection.query(`SHOW COLUMNS FROM articles LIKE 'status'`);
        console.log("Current Status Column Config:", cols);

        // Run ALTER
        await connection.query("ALTER TABLE articles MODIFY COLUMN status VARCHAR(50) DEFAULT 'draft'");
        console.log("SUCCESS: Executed ALTER TABLE articles MODIFY COLUMN status VARCHAR(50) DEFAULT 'draft'");

        // Check again
        const [colsNew] = await connection.query(`SHOW COLUMNS FROM articles LIKE 'status'`);
        console.log("New Status Column Config:", colsNew);

    } catch (e) {
        console.error("ERROR:", e.message);
    } finally {
        if (connection) await connection.end();
    }
}

fixStatus();

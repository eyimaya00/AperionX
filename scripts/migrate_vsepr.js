const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log("Adding source column to users table...");
        await pool.query('ALTER TABLE users ADD COLUMN source VARCHAR(50) DEFAULT NULL;');
        console.log("Migration successful.");
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log("Column 'source' already exists.");
        } else {
            console.error(e);
        }
    } finally {
        pool.end();
    }
}

migrate();

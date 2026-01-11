const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log("Checking 'users' table columns...");
        const [columns] = await pool.query("SHOW COLUMNS FROM users");
        const columnNames = columns.map(c => c.Field);
        console.log("Columns:", columnNames.join(', '));

        const missing = ['school', 'department', 'profile_image'].filter(c => !columnNames.includes(c));
        if (missing.length > 0) {
            console.log("MISSING Columns:", missing);
        } else {
            console.log("All required columns exist.");
        }

    } catch (e) {
        console.error("Schema Check Failed:", e.message);
    } finally {
        await pool.end();
    }
}

checkSchema();

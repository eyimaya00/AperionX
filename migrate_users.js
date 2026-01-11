const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateUsers() {
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
        console.log("Starting Migration for 'users' table...");

        // 1. Add profile_image
        try {
            await pool.query("ALTER TABLE users ADD COLUMN profile_image VARCHAR(255) DEFAULT NULL");
            console.log("Added column: profile_image");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log("Column exists: profile_image");
            else console.error("Error adding profile_image:", e.message);
        }

        // 2. Add school
        try {
            await pool.query("ALTER TABLE users ADD COLUMN school VARCHAR(255) DEFAULT NULL");
            console.log("Added column: school");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log("Column exists: school");
            else console.error("Error adding school:", e.message);
        }

        // 3. Add department
        try {
            await pool.query("ALTER TABLE users ADD COLUMN department VARCHAR(255) DEFAULT NULL");
            console.log("Added column: department");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log("Column exists: department");
            else console.error("Error adding department:", e.message);
        }

        console.log("Migration Complete.");
    } catch (e) {
        console.error("Migration Fatal Error:", e);
    } finally {
        await pool.end();
    }
}

migrateUsers();

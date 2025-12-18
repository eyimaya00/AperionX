const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'science_db'
};

async function addColumn() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected to database.");

        const [rows] = await connection.query(`SHOW COLUMNS FROM site_settings LIKE 'hero_button_text'`);

        if (rows.length === 0) {
            await connection.query("ALTER TABLE site_settings ADD COLUMN hero_button_text VARCHAR(255) DEFAULT 'Keşfetmeye Başla'");
            console.log("Added 'hero_button_text' column to site_settings.");
        } else {
            console.log("'hero_button_text' column already exists.");
        }

    } catch (error) {
        console.error('Error adding column:', error);
    } finally {
        if (connection) await connection.end();
    }
}

addColumn();

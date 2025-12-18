const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD,
    database: 'aperionx_db'
};

async function updateDatabase() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Add Category
        try {
            await connection.query("ALTER TABLE articles ADD COLUMN category VARCHAR(100)");
            console.log('Added category column.');
        } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.log(e.message); }

        // Add Tags
        try {
            await connection.query("ALTER TABLE articles ADD COLUMN tags TEXT");
            console.log('Added tags column.');
        } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.log(e.message); }

        // Add References
        try {
            await connection.query("ALTER TABLE articles ADD COLUMN references_list TEXT");
            console.log('Added references_list column.');
        } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.log(e.message); }

        // Add PDF URL
        try {
            await connection.query("ALTER TABLE articles ADD COLUMN pdf_url VARCHAR(255)");
            console.log('Added pdf_url column.');
        } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.log(e.message); }

        // Add Status
        try {
            await connection.query("ALTER TABLE articles ADD COLUMN status ENUM('draft', 'pending', 'published', 'rejected') DEFAULT 'draft'");
            console.log('Added status column.');
        } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.log(e.message); }

        console.log('Database update complete.');

    } catch (error) {
        console.error('Database update failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

updateDatabase();

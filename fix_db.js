const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function fixSchema() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Add 'status' column
        try {
            await connection.query("ALTER TABLE articles ADD COLUMN status ENUM('draft', 'published', 'archived') DEFAULT 'draft'");
            console.log("Added 'status' column.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log("'status' column already exists.");
            else console.error("Error adding 'status':", e.message);
        }

        // Add 'tags' column
        try {
            await connection.query("ALTER TABLE articles ADD COLUMN tags VARCHAR(255)");
            console.log("Added 'tags' column.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log("'tags' column already exists.");
            else console.error("Error adding 'tags':", e.message);
        }

        // Add 'references_list' column
        try {
            await connection.query("ALTER TABLE articles ADD COLUMN references_list TEXT");
            console.log("Added 'references_list' column.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log("'references_list' column already exists.");
            else console.error("Error adding 'references_list':", e.message);
        }

        // Add 'pdf_url' column
        try {
            await connection.query("ALTER TABLE articles ADD COLUMN pdf_url VARCHAR(255)");
            console.log("Added 'pdf_url' column.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log("'pdf_url' column already exists.");
            else console.error("Error adding 'pdf_url':", e.message);
        }

        // Add 'category' column if missing (it was in the plan but maybe not in DB)
        try {
            await connection.query("ALTER TABLE articles ADD COLUMN category VARCHAR(100)");
            console.log("Added 'category' column.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log("'category' column already exists.");
            else console.error("Error adding 'category':", e.message);
        }


    } catch (error) {
        console.error('Database connection failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

fixSchema();

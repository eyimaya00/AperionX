const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function updateSchema() {
    try {
        const conn = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        // Add is_approved to comments
        try {
            await conn.query(`ALTER TABLE comments ADD COLUMN is_approved BOOLEAN DEFAULT FALSE`);
            console.log('Added is_approved to comments.');
        } catch (e) {
            console.log('is_approved column might already exist:', e.message);
        }

        // Add updated_at to comments if needed
        try {
            await conn.query(`ALTER TABLE comments ADD COLUMN updated_at TIMESTAMP DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP`);
            console.log('Added updated_at to comments.');
        } catch (e) { console.log('updated_at might exist:', e.message); }

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

updateSchema();

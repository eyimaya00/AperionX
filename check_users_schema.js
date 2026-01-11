const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected.');
        const [rows] = await connection.query('SHOW COLUMNS FROM users');
        console.log('Columns:', rows.map(r => r.Field));
        await connection.end();
    } catch (e) {
        console.error('Schema Check Error:', e);
    }
}

checkSchema();

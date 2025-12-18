const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: process.env.DB_PASSWORD,
        database: 'aperionx_db'
    });

    try {
        const [rows] = await connection.execute('SHOW COLUMNS FROM site_settings');
        console.log('Columns:', rows.map(r => r.Field));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkSchema();

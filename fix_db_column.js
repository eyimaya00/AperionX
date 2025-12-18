const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function fixDb() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to DB. Altering table...');
        await connection.query("ALTER TABLE site_settings MODIFY setting_value TEXT");
        console.log('Table altered successfully.');
        await connection.end();
    } catch (error) {
        console.error('Error:', error.code, error.message);
    }
}

fixDb();

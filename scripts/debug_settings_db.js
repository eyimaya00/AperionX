const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function checkSettingsDB() {
    console.log('--- SETTINGS DB DEBUG ---');
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to DB.');

        console.log('Querying settings table...');
        const [rows] = await connection.query('SELECT * FROM settings');
        console.log(`Found ${rows.length} settings.`);
        console.table(rows);

        const settings = {};
        rows.forEach(r => settings[r.setting_key] = r.setting_value);
        console.log('JSON Output would be:');
        console.log(JSON.stringify(settings, null, 2));

    } catch (e) {
        console.error('FATAL DB ERROR:', e);
    } finally {
        if (connection) await connection.end();
    }
}

checkSettingsDB();

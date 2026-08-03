const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'aperionx_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('--- settings table ---');
        const [settingsRows] = await pool.query('SELECT setting_key, setting_value FROM settings');
        console.log(settingsRows);

        console.log('--- site_settings table ---');
        const [siteSettingsRows] = await pool.query('SELECT setting_key, setting_value FROM site_settings');
        console.log(siteSettingsRows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();

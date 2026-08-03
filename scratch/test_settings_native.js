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
        const key = 'test_key_123';
        const value = 'test_value_123';
        console.log('Inserting into settings table...');
        const [result] = await pool.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', [key, value]);
        console.log('Result:', result);

        const [rows] = await pool.query('SELECT * FROM settings WHERE setting_key = ?', [key]);
        console.log('Fetched row:', rows);

        // Cleanup
        await pool.query('DELETE FROM settings WHERE setting_key = ?', [key]);
        console.log('Cleanup done.');
    } catch (e) {
        console.error('SQL ERROR:', e.message);
    } finally {
        await pool.end();
    }
}

run();

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkMaintenance() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'aperionx_db'
    });

    try {
        const [rows] = await connection.query("SELECT * FROM site_settings WHERE setting_key = 'maintenance_mode'");
        console.log('Maintenance Setting in DB:', rows);
    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
    }
}

checkMaintenance();

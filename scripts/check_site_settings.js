const mysql = require('mysql2/promise');

async function checkSiteSettings() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'aperionx_db'
    });

    try {
        console.log('--- Table: site_settings ---');
        const [rows] = await pool.query('DESCRIBE site_settings');
        console.table(rows);

        console.log('\n--- Current Keys ---');
        const [data] = await pool.query('SELECT setting_key, setting_value FROM site_settings');
        console.table(data);

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        pool.end();
    }
}

checkSiteSettings();

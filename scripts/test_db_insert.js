const mysql = require('mysql2/promise');

async function testInsert() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'aperionx_db'
    });

    try {
        console.log('Testing INSERT about_hero_title...');
        await pool.query('INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)', ['about_hero_title', 'Test Title']);
        console.log('Success!');
    } catch (e) {
        console.error('INSERT Failed:', e.message);
        console.error('Code:', e.code);
    } finally {
        pool.end();
    }
}

testInsert();

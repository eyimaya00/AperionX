const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSettings() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: process.env.DB_PASSWORD,
        database: 'aperionx_db'
    });

    try {
        const [rows] = await connection.execute('SELECT articles_hero_title, articles_hero_title_color FROM site_settings WHERE id = 1');
        console.log('Current Settings:', rows[0]);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkSettings();

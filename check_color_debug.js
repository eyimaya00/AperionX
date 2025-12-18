const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkColor() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [rows] = await connection.execute('SELECT * FROM site_settings WHERE setting_key = "articles_hero_title_color"');
    console.log('Color setting:', rows);
    await connection.end();
}

checkColor().catch(console.error);

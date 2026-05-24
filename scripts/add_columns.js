const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function migrate() {
    const conn = await mysql.createConnection(dbConfig);
    try {
        await conn.query(`
            ALTER TABLE site_settings 
            ADD COLUMN showcase_title VARCHAR(255) DEFAULT 'Bu Hafta En Çok Okunan Makaleler',
            ADD COLUMN showcase_description TEXT;
        `);
        console.log('Columns added successfully.');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('Columns already exist.');
        } else {
            console.error(e);
        }
    } finally {
        conn.end();
    }
}

migrate();

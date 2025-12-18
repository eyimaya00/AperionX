const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateSchema() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'aperionx_db'
    });

    try {
        await pool.query("ALTER TABLE articles MODIFY content LONGTEXT");
        console.log('Content column updated to LONGTEXT');
    } catch (e) {
        console.error(e);
    }
    process.exit();
}

updateSchema();

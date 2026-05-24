const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'aperionx_db'
    });

    try {
        const [rows] = await pool.query("SHOW COLUMNS FROM articles LIKE 'content'");
        console.log('Content Column Type:', rows[0].Type);
    } catch (e) {
        console.error(e);
    }
    process.exit();
}

checkSchema();

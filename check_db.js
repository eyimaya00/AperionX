const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function check() {
    const conn = await mysql.createConnection(dbConfig);
    try {
        const [rows] = await conn.query('SELECT * FROM articles');
        console.log('Articles count:', rows.length);
        console.log('Articles:', rows);
    } catch (e) {
        console.error(e);
    } finally {
        conn.end();
    }
}

check();

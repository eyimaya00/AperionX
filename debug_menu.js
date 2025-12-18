const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function check() {
    let conn;
    try {
        conn = await mysql.createConnection(dbConfig);
        console.log('Connected to DB');

        // Check if table exists
        const [tables] = await conn.query("SHOW TABLES LIKE 'menu_items'");
        if (tables.length === 0) {
            console.log('Table menu_items DOES NOT EXIST');
        } else {
            console.log('Table menu_items EXISTS');
            const [rows] = await conn.query('SELECT * FROM menu_items');
            console.log('Rows:', rows);
        }

    } catch (e) {
        console.error('DB Error:', e);
    } finally {
        if (conn) conn.end();
    }
}

check();

require('dotenv').config();
const mysql = require('mysql2/promise');

async function test() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [rows] = await pool.query('SELECT id, label, url, parent_id, order_index FROM menu_items');
    console.table(rows);
    process.exit(0);
}
test();

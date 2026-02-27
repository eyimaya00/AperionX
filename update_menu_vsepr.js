require('dotenv').config();
const mysql = require('mysql2/promise');

async function r() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'aperionx_db'
        });

        const [result] = await pool.query('UPDATE menu_items SET url = "/vsepr.html" WHERE label LIKE "%Vsper%" OR label LIKE "%Vsepr%"');
        console.log("Updated rows:", result.affectedRows);

        const [rows] = await pool.query('SELECT * FROM menu_items WHERE label LIKE "%Vsper%" OR label LIKE "%Vsepr%"');
        console.log("Current menu items:", rows);

        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}
r();

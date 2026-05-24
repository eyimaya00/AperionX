const mysql = require('mysql2/promise');

async function checkColumns() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: 'password',
        database: 'aperionx_db'
    });

    try {
        const [rows] = await pool.query('DESCRIBE settings');
        console.log(rows.map(r => r.Field));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

checkColumns();

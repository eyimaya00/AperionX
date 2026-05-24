const mysql = require('mysql2/promise');

async function checkAuthors() {
    const dbConfig = {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'aperionx_db'
    };

    const pool = mysql.createPool(dbConfig);

    try {
        const [rows] = await pool.query("SELECT id, fullname, role FROM users WHERE role = 'author'");
        console.log('Authors found:', rows.length);
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

checkAuthors();

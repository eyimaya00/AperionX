const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
});

async function checkUser() {
    try {
        const [rows] = await pool.query('SELECT id, fullname, role, email FROM users WHERE id = 3');
        console.table(rows);
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkUser();

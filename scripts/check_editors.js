const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
});

async function checkEditors() {
    try {
        const [rows] = await pool.query("SELECT id, fullname, email, role FROM users WHERE role = 'editor'");
        console.log('List of Editors:');
        console.table(rows);
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkEditors();

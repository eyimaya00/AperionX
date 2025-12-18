const mysql = require('mysql2/promise');
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function checkUsers() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query("SELECT id, email, role FROM users");
        console.table(rows);
        await connection.end();
    } catch (e) {
        console.error(e);
    }
}
checkUsers();

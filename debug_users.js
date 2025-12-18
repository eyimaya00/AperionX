const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function checkUsers() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query("SELECT id, email, role FROM users");
        console.log(rows);
    } catch (e) { console.error(e); }
    finally { if (connection) connection.end(); }
}
checkUsers();

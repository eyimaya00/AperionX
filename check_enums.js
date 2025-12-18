const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function checkSchema() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [userCols] = await connection.query("SHOW COLUMNS FROM users LIKE 'role'");
        console.log('User Role:', userCols);

        const [artCols] = await connection.query("SHOW COLUMNS FROM articles LIKE 'status'");
        console.log('Article Status:', artCols);
    } catch (e) { console.error(e); }
    finally { if (connection) connection.end(); }
}
checkSchema();

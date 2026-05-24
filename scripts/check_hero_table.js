const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function checkTable() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query("SHOW TABLES LIKE 'hero_slides'");
        console.log('Tables:', rows);

        if (rows.length > 0) {
            const [cols] = await connection.query("DESCRIBE hero_slides");
            console.log('Columns:', cols);
        }
    } catch (e) { console.error(e); }
    finally { if (connection) connection.end(); }
}
checkTable();

const mysql = require('mysql2/promise');
require('dotenv').config();

async function listDbs() {

    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
    };

    let connection;
    try {
        connection = await mysql.createConnection(config);
        const [dbs] = await connection.query("SHOW DATABASES");
        console.log("Databases:", dbs);
    } catch (e) {
        console.error("ERROR:", e.message);
    } finally {
        if (connection) await connection.end();
    }
}

listDbs();

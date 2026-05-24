const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function check() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected.");

        const [triggers] = await connection.query("SHOW TRIGGERS LIKE 'articles'");
        console.log("TRIGGERS on articles:", JSON.stringify(triggers, null, 2));

        const [mode] = await connection.query("SELECT @@session.sql_mode as mode");
        console.log("SQL_MODE:", mode[0].mode);

        const [cols] = await connection.query("DESCRIBE articles status");
        console.log("STATUS COL:", JSON.stringify(cols, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        if (connection) connection.end();
    }
}
check();

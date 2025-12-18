const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function checkSchema() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute("DESCRIBE site_settings");
        console.log(JSON.stringify(rows, null, 2));
        await connection.end();
    } catch (error) {
        console.error(error);
    }
}

checkSchema();

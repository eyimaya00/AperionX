const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: 'aperionx_db'
};

async function checkSchema() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query("DESCRIBE articles");
        console.log(JSON.stringify(rows, null, 2));
        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkSchema();

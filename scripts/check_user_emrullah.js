const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function checkUser() {
    try {
        const connection = await mysql.createConnection(dbConfig);

        // Search by full name or email containing 'emrullah'
        const [rows] = await connection.execute(
            "SELECT id, email, fullname, role FROM users LIMIT 20"
        );

        console.log('User Search Results:', rows);
        await connection.end();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkUser();

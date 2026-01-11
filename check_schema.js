const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function checkSchema() {
    try {
        console.log('--- Articles Table ---');
        const [articlesCols] = await pool.query('SHOW COLUMNS FROM articles');
        console.log(articlesCols.map(c => c.Field).join(', '));

        console.log('\n--- Users Table ---');
        const [usersCols] = await pool.query('SHOW COLUMNS FROM users');
        console.log(usersCols.map(c => c.Field).join(', '));

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

checkSchema();

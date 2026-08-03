const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'aperionx_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        const [tables] = await pool.query('SHOW TABLES');
        console.log('Tables in database:');
        for (const t of tables) {
            const tableName = Object.values(t)[0];
            const [countRows] = await pool.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
            console.log(`- ${tableName}: ${countRows[0].count} rows`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();

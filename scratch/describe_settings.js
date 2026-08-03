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
        const [cols] = await pool.query("DESCRIBE settings");
        console.log('Columns in settings:');
        console.log(cols.map(c => ({ Field: c.Field, Type: c.Type })));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();

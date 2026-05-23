const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'aperionx'
        });

        const [rows] = await pool.query(`
            SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE REFERENCED_TABLE_SCHEMA = 'aperionx' AND REFERENCED_TABLE_NAME = 'experiments'
        `);
        console.log(rows);
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();

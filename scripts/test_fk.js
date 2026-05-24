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

        const [rows] = await pool.query('SHOW CREATE TABLE experiment_authors');
        console.log(rows[0]['Create Table']);
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();

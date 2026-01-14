const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function migrate() {
    try {
        const pool = mysql.createPool(dbConfig);
        console.log('Connected to DB:', dbConfig.database);

        const [result] = await pool.query("UPDATE users SET role = 'user' WHERE role IS NULL OR role = ''");

        console.log(`Migration complete. Updated ${result.affectedRows} users.`);

        await pool.end();
    } catch (e) {
        console.error('Migration failed:', e);
    }
}

migrate();

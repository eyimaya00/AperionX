
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function checkSchema() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'aperionx_db',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        const [columns] = await pool.query("SHOW COLUMNS FROM articles");
        console.log(columns.map(c => c.Field));
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkSchema();

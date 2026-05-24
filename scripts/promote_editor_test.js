const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function promote() {
    const pool = mysql.createPool(dbConfig);
    try {
        await pool.query("UPDATE users SET role = 'editor' WHERE email = 'editor_full_test@example.com'");
        console.log("Promoted editor_full_test@example.com to 'editor'");
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

promote();

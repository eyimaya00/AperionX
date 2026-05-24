require('dotenv').config();
const mysql = require('mysql2/promise');

async function test() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'aperionx_db'
        });
        const [users] = await pool.query(
            "SELECT id, fullname, email, username, role FROM users WHERE username = 'test.author'"
        );
        console.log(users);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
test();
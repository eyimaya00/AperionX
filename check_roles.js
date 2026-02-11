require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkRoles() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'aperionx_db'
    });

    try {
        const [rows] = await pool.query("SELECT role, COUNT(*) as count FROM users GROUP BY role");
        console.log('User Roles Distribution:', rows);

        const [allUsers] = await pool.query("SELECT id, email, role FROM users LIMIT 10");
        console.log('Sample Users:', allUsers);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

checkRoles();

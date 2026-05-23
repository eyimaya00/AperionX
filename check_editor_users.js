require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [rows] = await pool.query("SELECT id, fullname, username, email, role FROM users WHERE role IN ('editor', 'admin') ORDER BY role, id");
    console.log('Editor/Admin users:');
    console.log(JSON.stringify(rows, null, 2));

    const [allRoles] = await pool.query("SELECT role, COUNT(*) as count FROM users GROUP BY role");
    console.log('\nRole distribution:');
    console.log(JSON.stringify(allRoles, null, 2));

    await pool.end();
})();

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function check() {
    try {
        const pool = mysql.createPool(dbConfig);
        console.log('Connected to DB:', dbConfig.database);

        // Check Schema
        const [columns] = await pool.query(`SHOW COLUMNS FROM users LIKE 'role'`);
        if (columns.length > 0) {
            console.log('Role Column Type:', columns[0].Type);
        } else {
            console.log('Role column not found!');
        }

        const [rows] = await pool.query('SELECT id, fullname, role FROM users');
        console.log('Total users:', rows.length);
        console.log('User roles distribution:');

        const counts = {};
        rows.forEach(r => {
            const role = r.role === null ? 'NULL' : (r.role === '' ? 'EMPTY' : r.role);
            counts[role] = (counts[role] || 0) + 1;
        });
        console.log(counts);

        console.log('\nSample users (Last 20):');
        rows.slice(-20).forEach(r => console.log(`${r.id}: ${r.fullname} - [${r.role}]`));

        await pool.end();
    } catch (e) {
        console.error(e);
    }
}

check();

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

(async () => {
    try {
        const pool = mysql.createPool(dbConfig);
        const [rows] = await pool.query('SELECT id, fullname, email, role FROM users');
        console.log('Users:', rows);
        await pool.end();
    } catch (e) { console.error('Error:', e); }
})();

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function testApi() {
    let pool;
    try {
        pool = mysql.createPool(dbConfig);
        const [users] = await pool.query("SELECT * FROM users WHERE role = 'author'");
        console.log("Authors in DB:", users);

    } catch(e) {
        console.error(e);
    } finally {
        if(pool) await pool.end();
    }
}
testApi();

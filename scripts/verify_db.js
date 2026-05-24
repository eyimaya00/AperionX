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
        console.log('Attempting connection with:', dbConfig);
        const pool = mysql.createPool(dbConfig);
        const connection = await pool.getConnection();
        console.log('SUCCESS');
        connection.release();
        await pool.end();
    } catch (e) {
        console.error('ERROR_CODE:', e.code);
        console.error('ERROR_MSG:', e.message);
        console.error('FULL_ERROR:', e);
        process.exit(1);
    }
})();

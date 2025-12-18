const mysql = require('mysql2/promise');

const config = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db',
    maxAllowedPacket: 67108864 // 64MB
};

(async () => {
    console.log('Testing createConnection with maxAllowedPacket...');
    try {
        const conn = await mysql.createConnection(config);
        console.log('Connected!');
        await conn.end();
    } catch (e) {
        console.error('Connection failed:', e.message);
    }

    console.log('Testing createPool with maxAllowedPacket...');
    try {
        const pool = mysql.createPool(config);
        const conn = await pool.getConnection();
        console.log('Pool Connected!');
        conn.release();
        await pool.end();
    } catch (e) {
        console.error('Pool failed:', e.message);
    }
})();

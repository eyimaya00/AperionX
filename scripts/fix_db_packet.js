const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function fixPacketSize() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Check current value
        const [rows] = await connection.query("SHOW VARIABLES LIKE 'max_allowed_packet'");
        console.log('Current max_allowed_packet:', rows[0].Value, 'bytes');

        // Set new value (e.g., 64MB = 64 * 1024 * 1024 = 67108864)
        // Note: You might need SUPER privileges for GLOBAL, or just session if per session (but connection pool needs global/session init)
        // Usually for a persistent app issue, we need GLOBAL.
        try {
            await connection.query("SET GLOBAL max_allowed_packet=67108864");
            console.log('Set GLOBAL max_allowed_packet to 67108864 bytes (64MB).');
        } catch (err) {
            console.error('Failed to set GLOBAL variable (might need root/super user):', err.message);
        }

        const [rowsNew] = await connection.query("SHOW VARIABLES LIKE 'max_allowed_packet'");
        console.log('New max_allowed_packet:', rowsNew[0].Value, 'bytes');

        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

fixPacketSize();

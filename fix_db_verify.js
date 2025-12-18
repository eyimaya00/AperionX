const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function fixAndVerify() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        // Set GLOBAL
        await connection.query("SET GLOBAL max_allowed_packet=67108864");
        console.log('Executed SET GLOBAL max_allowed_packet=67108864');

        // Check GLOBAL
        const [rows] = await connection.query("SHOW GLOBAL VARIABLES LIKE 'max_allowed_packet'");
        console.log('GLOBAL max_allowed_packet IS NOW:', rows[0].Value);

        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

fixAndVerify();

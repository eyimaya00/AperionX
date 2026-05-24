const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function resetPass() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const hash = await bcrypt.hash('123456', 10);
        await connection.query('UPDATE users SET password = ? WHERE email = ?', [hash, 'admin@aperion.com']);
        console.log('Password reset to 123456 for admin@aperion.com');
        await connection.end();
    } catch (e) {
        console.error(e);
    }
}
resetPass();

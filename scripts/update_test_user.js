const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function resetPassword() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const hashedPassword = await bcrypt.hash('123456', 10);

        const [result] = await connection.query(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, 'testauthor_1765220254926@test.com']
        );

        console.log('Password updated. Affected rows:', result.affectedRows);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

resetPassword();

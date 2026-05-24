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

        // Reset for the typo'd email since that's likely the one they are trying
        const [result] = await connection.query(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, 'emrulalh@aperion.com']
        );

        console.log('Password updated for emrulalh@aperion.com. Affected rows:', result.affectedRows);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

resetPassword();

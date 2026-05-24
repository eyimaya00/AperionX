const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function resetAdmin() {
    let connection;
    try {
        console.log('Connecting...');
        connection = await mysql.createConnection(dbConfig);

        const email = 'admin@aperion.com';
        const newPass = '123admin';
        const hashed = await bcrypt.hash(newPass, 10);

        // Check exist
        const [rows] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);

        if (rows.length > 0) {
            console.log('Updating existing admin password...');
            await connection.query('UPDATE users SET password = ? WHERE email = ?', [hashed, email]);
        } else {
            console.log('Creating new admin user...');
            await connection.query('INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, ?)',
                ['Admin User', email, hashed, 'admin']);
        }

        console.log(`SUCCESS: Password for ${email} set to: ${newPass}`);

    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        if (connection) await connection.end();
    }
}

resetAdmin();

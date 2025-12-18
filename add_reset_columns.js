const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function addResetColumns() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Add reset_token column
        try {
            await connection.query(`ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL`);
            console.log('Added reset_token column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('reset_token column already exists.');
            } else {
                console.error('Error adding reset_token:', e.message);
            }
        }

        // Add reset_token_expires column
        try {
            await connection.query(`ALTER TABLE users ADD COLUMN reset_token_expires DATETIME DEFAULT NULL`);
            console.log('Added reset_token_expires column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('reset_token_expires column already exists.');
            } else {
                console.error('Error adding reset_token_expires:', e.message);
            }
        }

    } catch (error) {
        console.error('Database error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

addResetColumns();

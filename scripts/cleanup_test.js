const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function cleanup() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        // Find the test article
        await connection.query('DELETE FROM articles WHERE title = ? AND content = ?', ['Test Makale', '<p>Bu bir test makalesidir.</p>']);

        console.log('Test article deleted.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

cleanup();

require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateName() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS || process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('Connecting to database...');
        const [result] = await pool.query(
            "UPDATE users SET fullname = 'Sıla Karabulut' WHERE email = 'sila.karabulut13@gmail.com'"
        );

        if (result.affectedRows > 0) {
            console.log('✅ Name updated successfully for sila.karabulut13@gmail.com');
        } else {
            console.log('⚠️ User not found with that email.');
        }

    } catch (error) {
        console.error('Error updating name:', error);
    } finally {
        pool.end();
    }
}

updateName();

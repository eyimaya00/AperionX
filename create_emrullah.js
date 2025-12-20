const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function createEmrullah() {
    try {
        const connection = await mysql.createConnection(dbConfig);

        // Check if exists one last time by exact email
        const [rows] = await connection.execute("SELECT * FROM users WHERE email = ?", ['emrullah@aperionx.com']);
        if (rows.length > 0) {
            console.log('User already exists. Updating password to 123456');
            const hashedPassword = await bcrypt.hash('123456', 10);
            await connection.execute("UPDATE users SET password = ?, role = 'author', fullname='Emrullah Yazar' WHERE email = ?", [hashedPassword, 'emrullah@aperionx.com']);
        } else {
            console.log('Creating new user Emrullah...');
            const hashedPassword = await bcrypt.hash('123456', 10);
            await connection.execute(
                "INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, ?)",
                ['Emrullah Yazar', 'emrullah@aperionx.com', hashedPassword, 'author']
            );
        }

        console.log('Success! Email: emrullah@aperionx.com | Pass: 123456 | Role: author');
        await connection.end();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

createEmrullah();

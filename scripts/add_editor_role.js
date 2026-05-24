const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function addEditor() {
    const conn = await mysql.createConnection(dbConfig);
    try {
        console.log('Adding "editor" to ENUM...');
        await conn.query("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'author', 'editor') DEFAULT 'user'");

        console.log('Creating Editor User...');
        // Create an editor user
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('123editor', 10);

        // Insert or ignore if exists
        const [rows] = await conn.query("SELECT * FROM users WHERE email = 'editor@aperion.com'");
        if (rows.length === 0) {
            await conn.query("INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, ?)",
                ['Editor One', 'editor@aperion.com', hashedPassword, 'editor']);
            console.log('User editor@aperion.com created. Password: 123editor');
        } else {
            console.log('Editor user already exists, updating role just in case...');
            await conn.query("UPDATE users SET role = 'editor' WHERE email = 'editor@aperion.com'");
        }

    } catch (e) {
        console.error(e);
    } finally {
        conn.end();
    }
}

addEditor();

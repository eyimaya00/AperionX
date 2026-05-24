const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    multipleStatements: true
};

async function setupDatabase() {
    let connection;
    try {
        console.log('Connecting to MySQL server...');
        connection = await mysql.createConnection(dbConfig);

        console.log('Creating database aperionx_db if not exists...');
        await connection.query(`CREATE DATABASE IF NOT EXISTS aperionx_db`);
        await connection.query(`USE aperionx_db`);

        console.log('Creating users table...');
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                fullname VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('user', 'admin') DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await connection.query(createTableQuery);

        console.log('Creating site_settings table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS site_settings (
                setting_key VARCHAR(50) PRIMARY KEY,
                setting_value TEXT
            )
        `);

        // Insert default settings if empty
        const [settingsRows] = await connection.query('SELECT * FROM site_settings');
        if (settingsRows.length === 0) {
            await connection.query(`
                INSERT INTO site_settings (setting_key, setting_value) VALUES 
                ('site_title', 'AperionX'),
                ('site_logo', ''), 
                ('site_favicon', '')
            `);
        }

        console.log('Creating menu_items table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS menu_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                label VARCHAR(100) NOT NULL,
                url VARCHAR(255) NOT NULL,
                order_index INT DEFAULT 0
            )
        `);

        // Insert default menu items if empty
        const [menuRows] = await connection.query('SELECT * FROM menu_items');
        if (menuRows.length === 0) {
            await connection.query(`
                INSERT INTO menu_items (label, url, order_index) VALUES 
                ('Ana Sayfa', 'index.html', 1),
                ('Makaleler', '#', 2),
                ('Kategoriler', '#', 3),
                ('Hakkında', '#', 4)
            `);
        }

        console.log('Creating hero_slides table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS hero_slides (
                id INT AUTO_INCREMENT PRIMARY KEY,
                image_url VARCHAR(255) NOT NULL,
                order_index INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Creating articles table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS articles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                excerpt TEXT,
                content TEXT,
                image_url VARCHAR(255),
                views INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Creating showcase_items table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS showcase_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                article_id INT NOT NULL,
                position_id INT NOT NULL, 
                UNIQUE KEY unique_position (position_id),
                FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
            )
        `);

        // Check if admin exists
        const [rows] = await connection.query('SELECT * FROM users WHERE email = ?', ['admin@aperion.com']);

        if (rows.length === 0) {
            console.log('Creating Admin user...');
            const hashedPassword = await bcrypt.hash('123admin', 10);
            await connection.query(
                'INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, ?)',
                ['Admin User', 'admin@aperion.com', hashedPassword, 'admin']
            );
            console.log('Admin user created successfully.');
        } else {
            console.log('Admin user already exists.');
        }

        console.log('Database setup completed successfully!');

    } catch (error) {
        console.error('Error setting up database:', error);
    } finally {
        if (connection) await connection.end();
    }
}

setupDatabase();

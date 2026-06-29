const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        await connection.query(`
            CREATE TABLE IF NOT EXISTS category_cards (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(100) NOT NULL,
                description TEXT NOT NULL,
                icon_class VARCHAR(50) NOT NULL,
                link_url VARCHAR(255) NOT NULL,
                order_index INT DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Check if data exists, if not seed it
        const [rows] = await connection.query('SELECT COUNT(*) as count FROM category_cards');
        if (rows[0].count === 0) {
            await connection.query(`
                INSERT INTO category_cards (title, description, icon_class, link_url, order_index) VALUES 
                ('Makaleler', 'Bilim ve teknolojinin derinliklerine inen kapsamlı analizler.', 'ph-fill ph-book-open-text', '/articles', 1),
                ('Deneyler', 'Geleceği şekillendiren araştırma ve laboratuvar sonuçları.', 'ph-fill ph-flask', '/experiments', 2),
                ('Araçlar', 'Araştırmalarınızda kullanabileceğiniz hesaplama ve analiz araçları.', 'ph-fill ph-calculator', '/tools', 3),
                ('Hakkımızda', 'Biz kimiz, vizyonumuz ne ve AperionX nasıl çalışır öğrenin.', 'ph-fill ph-users-three', '/about', 4)
            `);
            console.log('Seeded initial category cards.');
        }

        console.log('Successfully created category_cards table.');
        await connection.end();
    } catch (error) {
        console.error('DB Error:', error);
    }
}

run();

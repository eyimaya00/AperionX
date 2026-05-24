const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function migrate() {
    try {
        const pool = mysql.createPool(dbConfig);
        const conn = await pool.getConnection();

        console.log('Creating menu_items table...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS menu_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                label VARCHAR(255) NOT NULL,
                url VARCHAR(255) NOT NULL,
                order_index INT DEFAULT 0,
                parent_id INT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_id) REFERENCES menu_items(id) ON DELETE CASCADE
            )
        `);
        console.log('menu_items table created.');

        // Alter settings table to add social links if not exists
        console.log('Checking settings table for extra columns...');
        try {
            await conn.query(`ALTER TABLE settings ADD COLUMN contact_email VARCHAR(255)`);
            console.log('Added contact_email');
        } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.log(e.message); }

        try {
            await conn.query(`ALTER TABLE settings ADD COLUMN social_twitter VARCHAR(255)`);
            console.log('Added social_twitter');
        } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.log(e.message); }

        try {
            await conn.query(`ALTER TABLE settings ADD COLUMN social_instagram VARCHAR(255)`);
            console.log('Added social_instagram');
        } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.log(e.message); }

        console.log('Migration complete.');
        process.exit();
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();

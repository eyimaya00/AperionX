const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
});

async function addColumns() {
    try {
        const connection = await pool.getConnection();

        // Check if columns exist
        const [columns] = await connection.execute("SHOW COLUMNS FROM settings LIKE 'articles_hero_title'");

        if (columns.length === 0) {
            console.log('Adding articles_hero_title and articles_hero_desc columns...');
            await connection.execute(`
                ALTER TABLE settings 
                ADD COLUMN articles_hero_title VARCHAR(255) DEFAULT 'Makaleler',
                ADD COLUMN articles_hero_desc TEXT
            `);
            console.log('Columns added successfully.');
        } else {
            console.log('Columns already exist.');
        }

        connection.release();
    } catch (e) {
        console.error('Error:', e);
    } finally {
        pool.end();
    }
}

addColumns();

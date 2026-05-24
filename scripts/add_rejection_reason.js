const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
});

async function migrate() {
    try {
        console.log('Adding rejection_reason column...');
        // Check if column exists first to avoid error
        const [columns] = await pool.query(`SHOW COLUMNS FROM articles LIKE 'rejection_reason'`);
        if (columns.length === 0) {
            await pool.query(`ALTER TABLE articles ADD COLUMN rejection_reason TEXT DEFAULT NULL`);
            console.log('Column added successfully.');
        } else {
            console.log('Column already exists.');
        }
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

migrate();

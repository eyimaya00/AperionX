const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function updateSchema() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: 'password',
        database: 'aperionx_db'
    });

    try {
        console.log('Adding about_hero columns...');
        // Try adding columns. If they exist, it might error, so we catch.
        try {
            await pool.query('ALTER TABLE settings ADD COLUMN about_hero_title VARCHAR(255) DEFAULT NULL');
            console.log('Added about_hero_title');
        } catch (e) { console.log('about_hero_title likely exists or error:', e.message); }

        try {
            await pool.query('ALTER TABLE settings ADD COLUMN about_hero_desc TEXT DEFAULT NULL');
            console.log('Added about_hero_desc');
        } catch (e) { console.log('about_hero_desc likely exists or error:', e.message); }

        console.log('Schema update complete.');

    } catch (e) {
        console.error('Fatal error:', e);
    } finally {
        pool.end();
    }
}

updateSchema();

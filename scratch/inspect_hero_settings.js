const mysql = require('mysql2/promise');

(async () => {
    try {
        const pool = mysql.createPool({
            host: '127.0.0.1',
            user: 'root',
            password: 's6fIwymToqEnBLcl',
            database: 'aperionx'
        });

        const [settings] = await pool.query('SELECT * FROM site_settings WHERE setting_key LIKE "%hero%"');
        console.log('--- Hero Settings ---');
        console.table(settings);

        const [slides] = await pool.query('SELECT * FROM hero_slides');
        console.log('--- Hero Slides ---');
        console.table(slides);

        await pool.end();
    } catch (e) {
        console.error(e);
    }
})();

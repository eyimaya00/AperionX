const mysql = require('mysql2/promise');

async function check() {
    try {
        const pool = mysql.createPool({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'aperionx_db'
        });

        console.log("Checking 'articles' table columns...");
        const [columns] = await pool.query("SHOW COLUMNS FROM articles");
        console.log(columns.map(c => c.Field));

        console.log("\nChecking published articles...");
        const [rows] = await pool.query("SELECT id, slug, status FROM articles LIMIT 5");
        console.log(rows);

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();

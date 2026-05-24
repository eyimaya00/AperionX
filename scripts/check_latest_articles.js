const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
});

async function checkArticles() {
    try {
        const [rows] = await pool.query('SELECT id, title, status, author_id, created_at FROM articles ORDER BY created_at DESC LIMIT 5');
        console.log('Latest 5 Articles:');
        console.table(rows);
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkArticles();

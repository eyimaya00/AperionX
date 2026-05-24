const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
});

async function checkMyArticles() {
    try {
        // ID 3 is the author from previous check
        const [rows] = await pool.query('SELECT * FROM articles WHERE author_id = 3 ORDER BY created_at DESC');
        console.log('API Response for User 3 (Author):');
        console.table(rows.map(a => ({ id: a.id, title: a.title, status: a.status, created: a.created_at })));
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkMyArticles();

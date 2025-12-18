const mysql = require('mysql2/promise');
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

(async () => {
    try {
        const conn = await mysql.createConnection(dbConfig);
        const [rows] = await conn.query("SELECT COUNT(*) as count FROM articles WHERE status = 'published'");
        console.log('Published Articles:', rows[0].count);

        const [all] = await conn.query("SELECT id, title, status FROM articles LIMIT 5");
        console.log('Sample Articles:', all);
        await conn.end();
    } catch (e) {
        console.error(e);
    }
})();

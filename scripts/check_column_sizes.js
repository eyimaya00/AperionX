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
        const [rows] = await conn.query("SELECT id, LENGTH(image_url) as img_len, LENGTH(content) as content_len FROM articles WHERE status='published' ORDER BY img_len DESC LIMIT 10");
        console.log('Top 10 largest image_url sizes:', rows);
        await conn.end();
    } catch (e) {
        console.error(e);
    }
})();

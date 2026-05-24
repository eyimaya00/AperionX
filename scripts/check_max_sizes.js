const mysql = require('mysql2/promise');

const config = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

(async () => {
    try {
        const conn = await mysql.createConnection(config);

        const [rows] = await conn.query(`
            SELECT 
                MAX(LENGTH(content)) as max_content,
                MAX(LENGTH(image_url)) as max_image,
                MAX(LENGTH(excerpt)) as max_excerpt,
                MAX(LENGTH(tags)) as max_tags
            FROM articles
        `);
        console.log('Max Sizes:', rows[0]);

        await conn.end();
    } catch (e) {
        console.error(e);
    }
})();

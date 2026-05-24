const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testQuery() {
    try {
        console.log('Testing JOIN Query...');
        const [articles] = await pool.query(`
            SELECT a.*, u.fullname AS author_name 
            FROM articles a 
            LEFT JOIN users u ON a.author_id = u.id 
            WHERE a.status = 'published' 
            ORDER BY a.created_at DESC
        `);
        console.log('Query Successful!');
        console.log('Count:', articles.length);
        if (articles.length > 0) {
            console.log('Sample:', articles[0].title, '| Author:', articles[0].author_name);
        }
    } catch (e) {
        console.error('QUERY FAILED:', e);
    } finally {
        pool.end();
    }
}

testQuery();

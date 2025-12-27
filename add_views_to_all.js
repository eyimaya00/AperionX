const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function addViews() {
    const conn = await mysql.createConnection(dbConfig);
    try {
        const [result] = await conn.query('UPDATE articles SET views = views + 20');
        console.log(`Successfully added 20 views to all articles.`);
        console.log(`Changed rows: ${result.changedRows}`);
    } catch (e) {
        console.error('Error updating views:', e);
    } finally {
        conn.end();
    }
}

addViews();

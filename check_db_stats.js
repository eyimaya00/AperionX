require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function checkArticleStats() {
    const conn = await mysql.createConnection(dbConfig);

    console.log('\n=== ARTICLE STATISTICS ===\n');

    // Count by status
    const [byStatus] = await conn.query(`
        SELECT status, COUNT(*) as count 
        FROM articles 
        GROUP BY status
    `);

    console.log('Articles by status:');
    byStatus.forEach(row => {
        console.log(`  ${row.status}: ${row.count}`);
    });

    console.log('\n');

    await conn.end();
}

checkArticleStats().catch(console.error);

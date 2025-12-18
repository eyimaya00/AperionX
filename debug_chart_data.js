const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function testQueries() {
    try {
        const pool = mysql.createPool(dbConfig);
        console.log('Connected to DB');

        // 3. Monthly Calculated Stats (Last 30 Days)
        const [mViews] = await pool.query('SELECT COUNT(*) as count FROM article_views WHERE viewed_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)');
        const [mLikes] = await pool.query('SELECT COUNT(*) as count FROM likes WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)');
        const [mComments] = await pool.query('SELECT COUNT(*) as count FROM comments WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)');
        const [mUsers] = await pool.query('SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)');
        const [mArticles] = await pool.query("SELECT COUNT(*) as count FROM articles WHERE status='published' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)");

        console.log('--- 30 Day Stats ---');
        console.log('Views:', mViews[0].count);
        console.log('Likes:', mLikes[0].count);
        console.log('Comments:', mComments[0].count);
        console.log('Users:', mUsers[0].count);
        console.log('Articles:', mArticles[0].count);

        // 4. Historical
        const getMonthGroups = async (table, dateCol) => {
            const [rows] = await pool.query(`SELECT DATE_FORMAT(${dateCol}, '%Y-%m') as month, COUNT(*) as count FROM ${table} GROUP BY month ORDER BY month DESC LIMIT 12`);
            return rows;
        };
        const getArticleMonthGroups = async () => {
            const [rows] = await pool.query(`SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count FROM articles WHERE status='published' GROUP BY month ORDER BY month DESC LIMIT 12`);
            return rows;
        };

        const hViews = await getMonthGroups('article_views', 'viewed_at');
        const hLikes = await getMonthGroups('likes', 'created_at');

        console.log('--- Historical Data Samples ---');
        console.log('History Views:', hViews);
        console.log('History Likes:', hLikes);

        process.exit();
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

testQueries();

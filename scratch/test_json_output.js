const pool = require('../config/db');

async function test() {
    const getExperimentMonthGroups = async () => {
        const [rows] = await pool.query(`SELECT DATE_FORMAT(COALESCE(published_at, created_at), '%Y-%m') as month, COUNT(*) as count FROM experiments WHERE status='published' AND deleted_at IS NULL GROUP BY month ORDER BY month DESC LIMIT 12`);
        return rows;
    };

    const getArticleMonthGroups = async () => {
        const [rows] = await pool.query(`SELECT DATE_FORMAT(COALESCE(published_at, created_at), '%Y-%m') as month, COUNT(*) as count FROM articles WHERE status='published' GROUP BY month ORDER BY month DESC LIMIT 12`);
        return rows;
    };

    const hArticles = await getArticleMonthGroups();
    const hExperiments = await getExperimentMonthGroups();

    const allMonths = new Set([
        ...hArticles.map(r => r.month),
        ...hExperiments.map(r => r.month)
    ]);
    const sortedMonths = Array.from(allMonths).sort().reverse().slice(0, 12);

    const monthlyHistory = sortedMonths.map(m => {
        return {
            month: m,
            articles: (hArticles.find(r => r.month === m) || {}).count || 0,
            experiments: (hExperiments.find(r => r.month === m) || {}).count || 0
        };
    });

    console.log('=== MONTHLY HISTORY RESPONSE ===');
    console.log(JSON.stringify(monthlyHistory, null, 2));

    process.exit(0);
}

test();

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

    console.log('--- hArticles ---', hArticles);
    console.log('--- hExperiments ---', hExperiments);

    process.exit(0);
}

test();

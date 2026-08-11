const pool = require('../config/db');

async function test() {
    const [exps] = await pool.query('SELECT id, title, status, created_at, published_at, deleted_at FROM experiments');
    console.log('=== ALL EXPERIMENTS IN DB ===');
    console.table(exps);

    const [publishedExps] = await pool.query("SELECT id, title, created_at, published_at, DATE_FORMAT(COALESCE(published_at, created_at), '%Y-%m') as month FROM experiments WHERE status='published' AND deleted_at IS NULL");
    console.log('\n=== PUBLISHED EXPERIMENTS GROUPED BY MONTH ===');
    console.table(publishedExps);

    // Test monthlyHistory logic directly
    const [hExperiments] = await pool.query(`SELECT DATE_FORMAT(COALESCE(published_at, created_at), '%Y-%m') as month, COUNT(*) as count FROM experiments WHERE status='published' AND deleted_at IS NULL GROUP BY month ORDER BY month DESC LIMIT 12`);
    console.log('\n=== hExperiments QUERY RESULT ===');
    console.log(hExperiments);

    process.exit(0);
}

test();

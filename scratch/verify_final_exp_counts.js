const pool = require('../config/db');

async function test() {
    console.log('=== EXPERIMENTS IN DB ===');
    const [exps] = await pool.query("SELECT id, title, created_at, published_at, DATE_FORMAT(COALESCE(published_at, created_at), '%Y-%m') as month FROM experiments WHERE status='published' AND deleted_at IS NULL ORDER BY COALESCE(published_at, created_at) DESC");
    console.table(exps);

    console.log('\n=== MONTHLY EXPERIMENT COUNTS ===');
    const [counts] = await pool.query("SELECT DATE_FORMAT(COALESCE(published_at, created_at), '%Y-%m') as month, COUNT(*) as count FROM experiments WHERE status='published' AND deleted_at IS NULL GROUP BY month ORDER BY month DESC");
    console.table(counts);

    process.exit(0);
}

test();

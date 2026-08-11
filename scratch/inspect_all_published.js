const pool = require('../config/db');

async function test() {
    const [artMonths] = await pool.query(`
        SELECT DATE_FORMAT(COALESCE(published_at, created_at), '%Y-%m') as month, COUNT(*) as count 
        FROM articles 
        WHERE status='published' AND deleted_at IS NULL 
        GROUP BY month ORDER BY month DESC
    `);
    console.log('=== PUBLISHED ARTICLES BY MONTH ===');
    console.table(artMonths);

    const [expMonths] = await pool.query(`
        SELECT DATE_FORMAT(COALESCE(published_at, created_at), '%Y-%m') as month, COUNT(*) as count 
        FROM experiments 
        WHERE status='published' AND deleted_at IS NULL 
        GROUP BY month ORDER BY month DESC
    `);
    console.log('\n=== PUBLISHED EXPERIMENTS BY MONTH ===');
    console.table(expMonths);

    const [allArts] = await pool.query("SELECT id, title, created_at, published_at, DATE_FORMAT(COALESCE(published_at, created_at), '%Y-%m') as month FROM articles WHERE status='published' ORDER BY id DESC LIMIT 20");
    console.log('\n=== RECENT PUBLISHED ARTICLES ===');
    console.table(allArts);

    process.exit(0);
}

test();

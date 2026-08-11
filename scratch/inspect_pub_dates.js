const pool = require('../config/db');

async function test() {
    const [exps] = await pool.query('SELECT id, title, status, created_at, published_at, deleted_at FROM experiments WHERE status = "published"');
    console.log('--- PUBLISHED EXPERIMENTS ---');
    exps.forEach(e => {
        console.log(`[Exp ${e.id}] ${e.title} | created_at: ${e.created_at} | published_at: ${e.published_at}`);
    });

    const [arts] = await pool.query('SELECT id, title, status, created_at, published_at FROM articles WHERE status = "published" AND DATE_FORMAT(COALESCE(published_at, created_at), "%Y-%m") = "2026-08"');
    console.log('\n--- ARTICLES PUBLISHED IN AUGUST 2026 ---');
    arts.forEach(a => {
        console.log(`[Article ${a.id}] ${a.title} | created_at: ${a.created_at} | published_at: ${a.published_at}`);
    });

    const [artsJuly] = await pool.query('SELECT id, title, status, created_at, published_at FROM articles WHERE status = "published" AND DATE_FORMAT(created_at, "%Y-%m") = "2026-08"');
    console.log('\n--- ARTICLES CREATED IN AUGUST 2026 ---');
    artsJuly.forEach(a => {
        console.log(`[Article ${a.id}] ${a.title} | created_at: ${a.created_at} | published_at: ${a.published_at}`);
    });

    process.exit(0);
}

test();

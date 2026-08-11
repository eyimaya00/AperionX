const pool = require('../config/db');

async function test() {
    const [exps] = await pool.query('SELECT * FROM experiments');
    console.log('--- ALL EXPERIMENTS (FULL) ---');
    console.log(exps);

    const [arts] = await pool.query('SELECT id, title, status, created_at, published_at FROM articles ORDER BY id DESC LIMIT 10');
    console.log('\n--- RECENT ARTICLES ---');
    console.log(arts);
    process.exit(0);
}

test();

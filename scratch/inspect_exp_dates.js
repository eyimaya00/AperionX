const pool = require('../config/db');

async function test() {
    const [exps] = await pool.query('SELECT id, title, status, created_at, published_at, deleted_at FROM experiments');
    console.log('--- ALL EXPERIMENTS ---');
    console.table(exps);
    process.exit(0);
}

test();

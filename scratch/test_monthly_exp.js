const pool = require('../config/db');

async function test() {
    const [rows] = await pool.query(`
        SELECT DATE_FORMAT(COALESCE(published_at, created_at), '%Y-%m') as month, COUNT(*) as count 
        FROM experiments 
        WHERE status='published' AND deleted_at IS NULL 
        GROUP BY month ORDER BY month DESC
    `);
    console.log('--- MONTHLY EXPERIMENT COUNTS BEFORE UPDATE ---');
    console.log(rows);
    process.exit(0);
}

test();

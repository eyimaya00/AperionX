const pool = require('../config/db');

async function test() {
    // Update Experiment ID 13 published date to August 2026
    await pool.query(
        "UPDATE experiments SET created_at = '2026-08-06 12:00:00', published_at = '2026-08-06 12:00:00' WHERE id = 13"
    );
    console.log('Updated Experiment ID 13 date to August 2026.');

    const [rows] = await pool.query(`
        SELECT DATE_FORMAT(COALESCE(published_at, created_at), '%Y-%m') as month, COUNT(*) as count 
        FROM experiments 
        WHERE status='published' AND deleted_at IS NULL 
        GROUP BY month ORDER BY month DESC
    `);
    console.log('\n--- MONTHLY EXPERIMENT COUNTS AFTER UPDATE ---');
    console.log(rows);
    process.exit(0);
}

test();

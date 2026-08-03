require('dotenv').config();
const pool = require('../config/db');

async function test() {
    try {
        const [res] = await pool.query(
            "UPDATE experiments SET status = 'rejected', approved_by = ?, rejection_reason = ? WHERE id = ?",
            [11, 'rejection reason test', 1]
        );
        console.log("SQL UPDATE result:", res);

        const [rows] = await pool.query('SELECT status, approved_by, rejection_reason FROM experiments WHERE id = 1');
        console.log("Experiment ID 1 status after UPDATE:", rows[0]);
    } catch (e) {
        console.error("SQL UPDATE error:", e);
    } finally {
        pool.end();
    }
}

test();

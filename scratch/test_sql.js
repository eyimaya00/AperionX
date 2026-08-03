require('dotenv').config();
const pool = require('../config/db');

async function run() {
    try {
        const [res] = await pool.query("UPDATE experiments SET status = ?, rejection_reason = NULL WHERE id = 1", ['pending']);
        console.log("SQL query execution check succeeded:", res);
    } catch (e) {
        console.error("SQL query execution check failed:", e);
    } finally {
        pool.end();
    }
}
run();

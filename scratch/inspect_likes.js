const pool = require('../config/db');

async function run() {
    try {
        console.log("--- TABLE: likes ROWS WHERE experiment_id IS NOT NULL ---");
        const [rows] = await pool.query("SELECT * FROM likes WHERE experiment_id IS NOT NULL");
        console.table(rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();

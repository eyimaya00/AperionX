const pool = require('../config/db');

async function run() {
    try {
        const [rows] = await pool.query("SELECT id, title, slug, pdf_url, youtube_url FROM experiments");
        console.log("--- EXPERIMENTS LIST ---");
        console.table(rows);
        process.exit(0);
    } catch (e) {
        console.error("Failed to query experiments:", e);
        process.exit(1);
    }
}

run();

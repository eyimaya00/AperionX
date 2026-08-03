require('dotenv').config();
const pool = require('../config/db');

async function inspect() {
    try {
        console.log("=== SEARCHING FOR FIRAT AVCI ===");
        const [users] = await pool.query("SELECT id, fullname, email, role FROM users WHERE fullname LIKE '%Fırat%' OR fullname LIKE '%Avcı%'");
        console.log(users);

        console.log("\n=== SEARCHING FOR EXPERIMENT ===");
        const [exps] = await pool.query("SELECT id, title, author_id, status, deleted_at, rejection_reason FROM experiments WHERE title LIKE '%Vitro%' OR title LIKE '%Hücre%'");
        console.log(exps);

        if (exps.length > 0) {
            const expId = exps[0].id;
            console.log(`\n=== CO-AUTHORS FOR EXPERIMENT ${expId} ===`);
            const [coAuthors] = await pool.query("SELECT * FROM experiment_authors WHERE experiment_id = ?", [expId]);
            console.log(coAuthors);
        }
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

inspect();

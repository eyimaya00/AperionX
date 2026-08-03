require('dotenv').config();
const pool = require('../config/db');

async function inspect() {
    try {
        const [users] = await pool.query('SELECT id, fullname, email, role FROM users');
        console.log("=== USERS ===");
        console.log(users);

        const [exps] = await pool.query('SELECT id, title, author_id, status, deleted_at, rejection_reason FROM experiments');
        console.log("\n=== EXPERIMENTS ===");
        console.log(exps);

        const [expAuthors] = await pool.query('SELECT * FROM experiment_authors');
        console.log("\n=== EXPERIMENT AUTHORS ===");
        console.log(expAuthors);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

inspect();

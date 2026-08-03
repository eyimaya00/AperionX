require('dotenv').config();
const pool = require('../config/db');

async function search() {
    try {
        const [usersCount] = await pool.query('SELECT COUNT(*) as count FROM users');
        console.log("Total users count:", usersCount[0].count);

        const [expsCount] = await pool.query('SELECT COUNT(*) as count FROM experiments');
        console.log("Total experiments count:", expsCount[0].count);

        const [firat] = await pool.query("SELECT * FROM users WHERE fullname LIKE '%Fırat%' OR fullname LIKE '%Avcı%' OR email LIKE '%firat%'");
        console.log("Firat users:", firat);

        const [allExps] = await pool.query("SELECT id, title, author_id, status FROM experiments");
        console.log("All experiments in DB:", allExps);
        
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

search();

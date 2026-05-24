const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'aperionx'
        });

        const [rows] = await pool.query('SELECT * FROM experiments ORDER BY id DESC LIMIT 5');
        console.log("LAST 5 EXPERIMENTS:");
        for (let row of rows) {
            console.log(`\nID: ${row.id} | Title: ${row.title} | Status: ${row.status}`);
            console.log(`Objective: ${row.objective ? row.objective.substring(0, 30) : 'EMPTY'}`);
            console.log(`Procedure: ${row.procedure_steps ? row.procedure_steps.substring(0, 30) : 'EMPTY'}`);
            console.log(`Results: ${row.results ? row.results.substring(0, 30) : 'EMPTY'}`);
        }
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();

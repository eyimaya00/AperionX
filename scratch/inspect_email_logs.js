const pool = require('../config/db');

async function test() {
    try {
        console.log("SHOW CREATE TABLE email_logs:");
        const [rows] = await pool.query("SHOW CREATE TABLE email_logs");
        console.log(rows[0]['Create Table']);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

test();

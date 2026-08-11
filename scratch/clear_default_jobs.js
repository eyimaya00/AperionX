const pool = require('../config/db');

async function test() {
    await pool.query("UPDATE users SET job_title = NULL WHERE job_title LIKE '%Araştırmacı Yazar%' OR job_title LIKE '%Biyolog%'");
    console.log('Cleared Araştırmacı Yazar / Biyolog default titles from users table.');
    process.exit(0);
}

test();

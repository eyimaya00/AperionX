const pool = require('../config/db');

async function test() {
    const [users] = await pool.query('SELECT id, fullname, username, email, job_title, public_email, linkedin_url FROM users');
    console.log('=== USERS IN DB ===');
    console.table(users);

    process.exit(0);
}

test();

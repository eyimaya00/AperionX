const pool = require('../config/db');

async function test() {
    // Test database columns
    try { await pool.query('ALTER TABLE users ADD COLUMN linkedin_url VARCHAR(255) NULL'); } catch(e) {}
    try { await pool.query('ALTER TABLE users ADD COLUMN public_email VARCHAR(255) NULL'); } catch(e) {}
    try { await pool.query('ALTER TABLE users ADD COLUMN show_email TINYINT(1) DEFAULT 1'); } catch(e) {}

    const [cols] = await pool.query('SHOW COLUMNS FROM users');
    console.log('=== USERS TABLE COLUMNS AFTER MIGRATION ===');
    console.table(cols.map(c => ({ Field: c.Field, Type: c.Type })));

    // Update test user (User ID 30 or 16) with LinkedIn and Public Email
    await pool.query(
        "UPDATE users SET linkedin_url = 'https://www.linkedin.com/in/test-author', public_email = 'test.author@aperionx.com', show_email = 1 WHERE id = 30"
    );

    const [u] = await pool.query('SELECT id, fullname, username, email, linkedin_url, public_email, show_email FROM users WHERE id = 30');
    console.log('\n=== UPDATED TEST USER ===');
    console.log(u[0]);

    process.exit(0);
}

test();

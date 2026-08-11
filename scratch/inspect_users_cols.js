const pool = require('../config/db');

async function test() {
    const [cols] = await pool.query('SHOW COLUMNS FROM users');
    console.log('=== USERS TABLE COLUMNS ===');
    console.table(cols.map(c => ({ Field: c.Field, Type: c.Type })));
    process.exit(0);
}

test();

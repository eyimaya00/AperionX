
const mysql = require('mysql2/promise');
require('dotenv').config();

async function diagnoseEmailLogs() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS || process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('--- Diagnosing Email Logs ---');

        // 1. Check Table Structure
        console.log('1. Checking table structure...');
        const [columns] = await pool.query("SHOW COLUMNS FROM email_logs");
        console.log('✅ Table exists. Columns:', columns.map(c => c.Field).join(', '));

        // 2. Check Row Count
        console.log('2. Checking row count...');
        const [rows] = await pool.query("SELECT COUNT(*) as count FROM email_logs");
        console.log(`✅ Table has ${rows[0].count} rows.`);

        // 3. Try to select with JOIN (simulate API query)
        console.log('3. Testing API query (Join with articles)...');
        // Note: Use LEFT JOIN to avoid issues if article was deleted, though schema usually has FK.
        // Also check if 'articles' table exists.

        const [apiRows] = await pool.query(`
            SELECT el.*, a.title as article_title 
            FROM email_logs el 
            LEFT JOIN articles a ON el.article_id = a.id 
            ORDER BY el.sent_at DESC LIMIT 5
        `);
        console.log('✅ Query successful. Retrieved rows:', apiRows.length);
        if (apiRows.length > 0) {
            console.log('Sample row:', apiRows[0]);
        }

    } catch (e) {
        console.error('❌ DIAGNOSIS FAILED:', e.message);
        if (e.code === 'ER_NO_SUCH_TABLE') {
            console.error('⚠️ Table email_logs DOES NOT EXIST. Run create_email_logs.js again.');
        }
    } finally {
        pool.end();
    }
}

diagnoseEmailLogs();

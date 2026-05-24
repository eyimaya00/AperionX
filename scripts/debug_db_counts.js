const mysql = require('mysql2/promise');
const axios = require('axios'); // Requires axios, but we can use fetch if node 18+ or just http
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function check() {
    console.log("=== DEBUGGING VIEW COUNTS ===");
    const conn = await mysql.createConnection(dbConfig);

    try {
        // 1. Check DB Directly
        const [all] = await conn.query("SELECT SUM(views) as total FROM articles");
        const [published] = await conn.query("SELECT SUM(views) as total FROM articles WHERE status = 'published'");
        const [trash] = await conn.query("SELECT SUM(views) as total FROM articles WHERE status != 'published'");

        console.log(`[DB] Total Views (ALL): ${all[0].total}`);
        console.log(`[DB] Total Views (PUBLISHED): ${published[0].total}`);
        console.log(`[DB] Total Views (NOT PUBLISHED): ${trash[0].total}`);

        // 2. Check Running API
        // First login to get token
        // Use a known admin logic or just register a temp one if needed, but better to assume standard admin exists?
        // Let's use the DB to find an admin user to simulate login? No, we need password.
        // Actually, we can just skip API check if we trust the DB check matches what user says. 
        // If DB [DB] Published is 846, but User sees 1116, then Server Code is WRONG.
        // If DB [DB] Published is 1116, then Data is WRONG.

    } catch (e) {
        console.error(e);
    } finally {
        conn.end();
    }
}

check();

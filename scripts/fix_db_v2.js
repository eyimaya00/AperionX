const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function fixDatabase() {
    console.log('--- STARTING DATABASE REPAIR ---');
    console.log(`Connecting to ${dbConfig.database}...`);

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected!');

        // 1. Fix 'role' column (Data truncated error)
        try {
            console.log('Fixing users.role column...');
            // First, try to convert to VARCHAR(50) to support 'reader', 'admin' etc.
            await connection.query("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) DEFAULT 'reader'");
            console.log('✅ SUCCESS: users.role is now VARCHAR(50).');
        } catch (e) {
            console.error('❌ ERROR fixing role:', e.message);
        }

        // 2. Add missing reset_token columns
        try {
            console.log('Checking for reset_token columns...');
            await connection.query("ALTER TABLE users ADD COLUMN reset_token VARCHAR(255)");
            console.log('✅ SUCCESS: Added reset_token.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️ SKIP: reset_token already exists.');
            else console.error('❌ ERROR adding reset_token:', e.message);
        }

        try {
            await connection.query("ALTER TABLE users ADD COLUMN reset_token_expires DATETIME");
            console.log('✅ SUCCESS: Added reset_token_expires.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️ SKIP: reset_token_expires already exists.');
            else console.error('❌ ERROR adding reset_token_expires:', e.message);
        }

        // 3. Add missing avatar/bio columns
        try {
            await connection.query("ALTER TABLE users ADD COLUMN bio TEXT");
            console.log('✅ SUCCESS: Added bio.');
        } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.error(e.message); }

        try {
            await connection.query("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255)");
            console.log('✅ SUCCESS: Added avatar_url.');
        } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.error(e.message); }


        console.log('--- REPAIR COMPLETE ---');
        console.log('You can now start the server with: node server.js');

    } catch (err) {
        console.error('FATAL CONNECTION ERROR:', err);
    } finally {
        if (connection) await connection.end();
    }
}

fixDatabase();

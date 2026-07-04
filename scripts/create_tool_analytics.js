const pool = require('../config/db');

async function migrate() {
    let conn;
    try {
        conn = await pool.getConnection();

        // 1. Add 'source' column to users table
        console.log('[Migration] Adding source column to users table...');
        try {
            await conn.query(`ALTER TABLE users ADD COLUMN source VARCHAR(50) DEFAULT NULL`);
            console.log('[Migration] ✅ source column added to users.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('[Migration] ⚠️ source column already exists in users.');
            } else {
                throw e;
            }
        }

        // 2. Create tool_analytics table
        console.log('[Migration] Creating tool_analytics table...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS tool_analytics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tool_name VARCHAR(50) NOT NULL,
                action_type VARCHAR(50) NOT NULL,
                ip_address VARCHAR(45) DEFAULT NULL,
                user_id INT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_tool_name (tool_name),
                INDEX idx_action_type (action_type),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('[Migration] ✅ tool_analytics table created.');

        console.log('[Migration] All migrations completed successfully!');
    } catch (error) {
        console.error('[Migration] ERROR:', error.message);
    } finally {
        if (conn) conn.release();
        process.exit(0);
    }
}

migrate();

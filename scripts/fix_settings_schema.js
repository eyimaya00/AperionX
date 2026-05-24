const mysql = require('mysql2/promise');

async function fixSchema() {
    const pool = mysql.createPool({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'aperionx_db'
    });

    try {
        console.log("Checking settings table schema...");
        const [columns] = await pool.query("SHOW COLUMNS FROM settings");
        console.log("Current Columns:", columns.map(c => c.Field));

        const hasKey = columns.some(c => c.Field === 'setting_key');
        if (!hasKey) {
            console.log("Missing setting_key column. Attempting to fix...");
            // It might be using 'key' instead of 'setting_key' or just be a different table.
            // Let's drop and recreate if it's safe (checked manually, usually settings are config).
            // But let's try to ALTER first.
            try {
                await pool.query("ALTER TABLE settings ADD COLUMN setting_key VARCHAR(255) UNIQUE NOT NULL");
                console.log("Added setting_key column.");
            } catch (e) {
                console.error("Error adding setting_key:", e.message);
            }
        }

        const hasValue = columns.some(c => c.Field === 'setting_value');
        if (!hasValue) {
            try {
                await pool.query("ALTER TABLE settings ADD COLUMN setting_value TEXT");
                console.log("Added setting_value column.");
            } catch (e) {
                console.error("Error adding setting_value:", e.message);
            }
        }

        console.log("Schema check complete.");
        process.exit(0);

    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

fixSchema();

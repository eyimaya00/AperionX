const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function initMaintenanceSettings() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        console.log('--- Initializing Maintenance Settings ---');

        const settings = [
            { key: 'maintenance_mode', value: 'false' },
            { key: 'maintenance_secret', value: generateSecret() },
            { key: 'maintenance_target_date', value: getNextMonday() } // Default to next Monday
        ];

        for (const s of settings) {
            // Insert if not exists (IGNORE)
            const [res] = await connection.query(
                'INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES (?, ?)',
                [s.key, s.value]
            );
            if (res.affectedRows > 0) {
                console.log(`[NEW] Added setting: ${s.key}`);
            } else {
                console.log(`[SKIP] Setting exists: ${s.key}`);
            }
        }

        console.log('--- Database Init Complete ---');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

function generateSecret() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function getNextMonday() {
    const d = new Date();
    d.setDate(d.getDate() + (1 + 7 - d.getDay()) % 7);
    d.setHours(9, 0, 0, 0); // 09:00
    return d.toISOString().slice(0, 19).replace('T', ' ');
}

initMaintenanceSettings();

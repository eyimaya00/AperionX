const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

function slugify(text) {
    if (!text) return 'user-' + Date.now();
    const trMap = {
        'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ş': 's', 'Ş': 's',
        'ü': 'u', 'Ü': 'u', 'ı': 'i', 'İ': 'i', 'ö': 'o', 'Ö': 'o'
    };
    return text
        .split('')
        .map(char => trMap[char] || char)
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

async function run() {
    console.log('🔌 Connecting to DB...');
    const pool = mysql.createPool(dbConfig);

    try {
        console.log('🔍 Auditing ALL Users...');
        const [users] = await pool.query("SELECT id, fullname, username FROM users ORDER BY id ASC");

        console.log(`📋 Total Users Found: ${users.length}`);
        console.log('---------------------------------------------------');
        console.log('ID | Name | Current Username | Status');
        console.log('---------------------------------------------------');

        let fixedCount = 0;

        for (const u of users) {
            let status = '✅ OK';
            let needsFix = !u.username || u.username.trim() === '' || u.username === 'NULL';

            if (needsFix) {
                // Generate Slug
                let baseSlug = slugify(u.fullname);
                if (!baseSlug || baseSlug.length < 3) baseSlug = `user-${u.id}`;

                let uniqueSlug = baseSlug;
                let counter = 1;

                // Ensure Uniqueness
                while (true) {
                    const [check] = await pool.query('SELECT id FROM users WHERE username = ? AND id != ?', [uniqueSlug, u.id]);
                    if (check.length === 0) break;
                    uniqueSlug = `${baseSlug}-${counter}`;
                    counter++;
                }

                // Update DB
                await pool.query('UPDATE users SET username = ? WHERE id = ?', [uniqueSlug, u.id]);
                status = `🛠️ FIXED -> ${uniqueSlug}`;
                fixedCount++;
            }

            console.log(`${u.id} | ${u.fullname} | ${u.username || '(EMPTY)'} | ${status}`);
        }

        console.log('---------------------------------------------------');
        console.log(`🏁 Audit Complete. Fixed ${fixedCount} users.`);

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await pool.end();
        process.exit();
    }
}

run();

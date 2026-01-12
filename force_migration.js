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
    if (!text) return '';
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
    console.log('Connecting to DB...');
    const pool = mysql.createPool(dbConfig);

    try {
        console.log('Checking for null/empty usernames...');
        const [users] = await pool.query("SELECT id, fullname, username FROM users WHERE username IS NULL OR username = ''");

        console.log(`Found ${users.length} users needing migration.`);

        if (users.length > 0) {
            for (const u of users) {
                let baseSlug = slugify(u.fullname);
                if (!baseSlug) baseSlug = 'user';

                let uniqueSlug = baseSlug;
                let counter = 1;
                while (true) {
                    const [check] = await pool.query('SELECT id FROM users WHERE username = ? AND id != ?', [uniqueSlug, u.id]);
                    if (check.length === 0) break;
                    uniqueSlug = `${baseSlug}-${counter}`;
                    counter++;
                }

                await pool.query('UPDATE users SET username = ? WHERE id = ?', [uniqueSlug, u.id]);
                console.log(`✅ Fixed: ${u.fullname} -> ${uniqueSlug}`);
            }
        } else {
            console.log('✨ All users already have usernames!');
            const [sample] = await pool.query('SELECT id, fullname, username FROM users LIMIT 3');
            console.log('Samples:', sample);
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
        process.exit();
    }
}

run();

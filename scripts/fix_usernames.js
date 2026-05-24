
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
    return text.toString()
        .split('')
        .map(c => trMap[c] || c)
        .join('')
        .toLowerCase()
        .replace(/\s+/g, '.')     // Replace spaces with .
        .replace(/[^\w\.]+/g, '') // Remove all non-word chars
        .replace(/\.\.+/g, '.')   // Replace multiple . with single .
        .replace(/^\.+/, '')       // Trim . from start
        .replace(/\.+$/, '');      // Trim . from end
}

async function run() {
    try {
        console.log('Connecting to DB...');
        const pool = mysql.createPool(dbConfig);

        // 1. Check for users with NULL or empty username
        const [users] = await pool.query("SELECT id, fullname, username FROM users WHERE username IS NULL OR username = ''");

        console.log(`Found ${users.length} users with missing usernames.`);

        for (const user of users) {
            let baseSlug = slugify(user.fullname);
            let finalSlug = baseSlug;
            let counter = 1;

            // Check uniqueness
            while (true) {
                const [exists] = await pool.query("SELECT id FROM users WHERE username = ? AND id != ?", [finalSlug, user.id]);
                if (exists.length === 0) break;
                finalSlug = `${baseSlug}${counter}`;
                counter++;
            }

            console.log(`Updating user ${user.id} (${user.fullname}) -> username: ${finalSlug}`);
            await pool.query("UPDATE users SET username = ? WHERE id = ?", [finalSlug, user.id]);
        }

        console.log('Done.');
        process.exit(0);

    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

run();

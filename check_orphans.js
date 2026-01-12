const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

(async () => {
    try {
        const pool = mysql.createPool(dbConfig);

        // 1. Get all Author IDs from articles
        const [articles] = await pool.query('SELECT id, title, author_id FROM articles');
        console.log(`Total Articles: ${articles.length}`);

        // 2. Get all User IDs
        const [users] = await pool.query('SELECT id, username, fullname FROM users');
        const userIds = new Set(users.map(u => u.id));
        console.log(`Total Users: ${users.length}`);
        console.log('Users:', users.map(u => `${u.id}:${u.username}`));

        // 3. Find Orphans
        const orphans = articles.filter(a => !userIds.has(a.author_id));

        if (orphans.length > 0) {
            console.log('\nFound Articles with Missing Authors (Orphans):');
            orphans.forEach(a => console.log(`- Article "${a.title}" (ID: ${a.id}) has author_id: ${a.author_id}`));

            // Suggest a fix: Update these to the first available admin/user
            if (users.length > 0) {
                const fallbackUser = users[0];
                console.log(`\nSUGGESTION: Update these orphans to User ID ${fallbackUser.id} (${fallbackUser.fullname})?`);
            }
        } else {
            console.log('\nAll articles have valid authors.');
        }

    } catch (e) {
        console.error(e);
    }
    process.exit();
})();

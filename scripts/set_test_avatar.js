const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function updateUserAvatar() {
    const pool = mysql.createPool(dbConfig);
    try {
        console.log('Updating avatar for Yasin Eyimaya...');
        // Set a default avatar or a specific one if known. Using a placeholder for now or checking provided image.
        // User uploaded uploaded_image_1768390961281.png which might be relevant but I can't link it directly easily unless I move it.
        // For now, let's just set it to 'uploads/logo.png' or similar existing one to PROVE it works.
        // Better: Set it to 'uploads/avatar_yasin.png' if I can copy one, or just a known external URL for test?
        // No, keep it local. 'uploads/logo.png' is safe to test rendering.

        await pool.query("UPDATE users SET avatar_url = 'uploads/logo.png' WHERE fullname = 'Yasin Eyimaya'");
        console.log('Avatar URL updated to uploads/logo.png for testing.');

        const [rows] = await pool.query("SELECT id, fullname, avatar_url FROM users WHERE fullname = 'Yasin Eyimaya'");
        console.log('Updated User Data:', rows);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

updateUserAvatar();

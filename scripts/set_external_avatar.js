const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function setExternalAvatar() {
    const pool = mysql.createPool(dbConfig);
    try {
        console.log('Update Yasin Eyimaya to external avatar...');
        // Use a reliable external image to test if it's a path issue
        const externalUrl = 'https://ui-avatars.com/api/?name=Yasin+Eyimaya&background=random';
        await pool.query("UPDATE users SET avatar_url = ? WHERE fullname = 'Yasin Eyimaya'", [externalUrl]);

        console.log('Updated to:', externalUrl);
        const [rows] = await pool.query("SELECT id, fullname, avatar_url FROM users WHERE fullname = 'Yasin Eyimaya'");
        console.log('User Data:', rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

setExternalAvatar();

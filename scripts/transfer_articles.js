const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function transferArticles() {
    try {
        const connection = await mysql.createConnection(dbConfig);

        // 1. Get Emrullah's ID
        const [users] = await connection.execute("SELECT id FROM users WHERE email = 'emrullah@aperionx.com'");
        if (users.length === 0) {
            console.log('Emrullah user not found!');
            return;
        }
        const emrullahId = users[0].id;
        console.log(`Found Emrullah ID: ${emrullahId}`);

        // 2. Transfer NULL authors to Emrullah
        // const [nullUpdate] = await connection.execute("UPDATE articles SET author_id = ? WHERE author_id IS NULL", [emrullahId]);
        // console.log(`Transferred ${nullUpdate.affectedRows} articles (from NULL status) to Emrullah.`);

        // 3. Transfer articles from User ID 3 (Ghost) to Emrullah
        const [id3Update] = await connection.execute("UPDATE articles SET author_id = ? WHERE author_id = 3", [emrullahId]);
        console.log(`Transferred ${id3Update.affectedRows} articles from Ghost User (ID 3) to Emrullah.`);

        // 3. Inspect User ID 3 (who has 20 articles)
        const [user3] = await connection.execute("SELECT id, fullname, email, role FROM users WHERE id = 3");
        console.log('User ID 3 details:', user3);

        // 4. Inspect User ID 1 (Admin)
        const [user1] = await connection.execute("SELECT id, fullname, email, role FROM users WHERE id = 1");
        console.log('User ID 1 details:', user1);

        await connection.end();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

transferArticles();

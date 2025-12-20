const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function findAuthor() {
    try {
        const connection = await mysql.createConnection(dbConfig);

        // 1. Find Author ID from Articles
        console.log('Searching articles for Emrullah...');
        // Checking if 'author_name' or similar exists, or if we join users.
        // Assuming articles has author_id. Let's list articles with Emrullah name if stored denormalized, 
        // OR filtering logic usually involves joining.
        // But if I don't know the exact column, I'll describe articles first?
        // Wait, typical schema: articles (id, title, author_id, ...).
        // If 'Emrullah' wrote them, maybe his name is embedded in content? Or maybe the user THINKS he is Emrullah but the DB name is different.
        // User says "appears as admin". Maybe I search for 'admin' users and list them?

        // Let's Search for ALL users with role 'admin' first, maybe one of them is him.
        const [admins] = await connection.execute("SELECT id, fullname, email, role FROM users WHERE role = 'admin'");
        console.log('Current Admins:', admins);

        // Also let's see if we can find any article by him title-wise or just list recent articles with author details
        const [articles] = await connection.execute(`
            SELECT a.id, a.title, a.author_id, u.fullname, u.email, u.role
            FROM articles a
            JOIN users u ON a.author_id = u.id
            WHERE u.fullname LIKE '%emrullah%' OR u.email LIKE '%emrullah%'
            LIMIT 5
        `);
        console.log('Articles by Emrullah:', articles);

        // If previous search failed, maybe he IS an admin but not named emrullah? 
        // "hayır bu makaleleri yazmıştı ... admin olarak gözüküyor"
        // Maybe the user IS 'admin' (User ID 1 typically).
        // Let's check User ID 1.

        const [user1] = await connection.execute("SELECT id, fullname, email, role FROM users WHERE id = 1");
        console.log('User ID 1:', user1);

        await connection.end();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

findAuthor();

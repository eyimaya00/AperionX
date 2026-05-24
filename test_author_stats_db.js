const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function testStats() {
    let pool;
    try {
        pool = mysql.createPool(dbConfig);
        console.log("Connected to DB");

        // Use the first author found in DB
        const [users] = await pool.query("SELECT id FROM users WHERE role = 'author' LIMIT 1");
        if (users.length === 0) {
            console.log("No authors found");
            return;
        }
        const userId = users[0].id;
        console.log("Testing with user ID:", userId);

        const [published] = await pool.query("SELECT COUNT(*) as count FROM articles WHERE author_id = ? AND status = 'published'", [userId]);
        const [pending] = await pool.query("SELECT COUNT(*) as count FROM articles WHERE author_id = ? AND status = 'pending'", [userId]);
        const [views] = await pool.query("SELECT SUM(views) as count FROM articles WHERE author_id = ? AND status = 'published'", [userId]);
        
        const [likes] = await pool.query(`
            SELECT COUNT(l.id) as count 
            FROM likes l 
            JOIN articles a ON l.article_id = a.id 
            WHERE a.author_id = ?
        `, [userId]);

        const [comments] = await pool.query(`
            SELECT COUNT(c.id) as count 
            FROM comments c 
            JOIN articles a ON c.article_id = a.id 
            WHERE a.author_id = ?
        `, [userId]);

        console.log({
            published: published[0].count,
            pending: pending[0].count,
            views: views[0].count || 0,
            likes: likes[0].count || 0,
            comments: comments[0].count || 0
        });

    } catch (e) {
        console.error("ERROR CAUGHT:");
        console.error(e);
    }
    finally { 
        if (pool) await pool.end(); 
    }
}
testStats();

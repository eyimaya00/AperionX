const pool = require('../config/db');

async function test() {
    try {
        console.log("Describing comments table:");
        const [rows] = await pool.query("DESCRIBE comments");
        console.log(rows);
        
        console.log("\nTrying article comments query:");
        const [comments] = await pool.query(
            "SELECT c.*, u.fullname FROM comments c JOIN users u ON c.user_id = u.id WHERE c.article_id = 1"
        );
        console.log("Success without is_approved. Count:", comments.length);

        console.log("\nTrying query with c.is_approved = 1:");
        const [commentsApproved] = await pool.query(
            "SELECT c.*, u.fullname FROM comments c JOIN users u ON c.user_id = u.id WHERE c.article_id = 1 AND (c.is_approved = 1)"
        );
        console.log("Success with is_approved. Count:", commentsApproved.length);
    } catch (e) {
        console.error("Error occurred:", e);
    } finally {
        await pool.end();
    }
}

test();

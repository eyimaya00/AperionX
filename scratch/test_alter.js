const pool = require('../config/db');

async function test() {
    try {
        console.log("Modifying comments table...");
        await pool.query("ALTER TABLE comments MODIFY COLUMN article_id INT NULL");
        console.log("Success modifying article_id to NULL!");
        
        const [rows] = await pool.query("DESCRIBE comments");
        console.log(rows);
    } catch (e) {
        console.error("Alter failed:", e);
    } finally {
        await pool.end();
    }
}

test();

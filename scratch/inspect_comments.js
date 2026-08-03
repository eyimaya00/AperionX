const pool = require('../config/db');

async function test() {
    try {
        console.log("All rows in comments table:");
        const [rows] = await pool.query("SELECT * FROM comments");
        console.log(rows);
        
        console.log("\nAll rows in users table:");
        const [users] = await pool.query("SELECT id, fullname, email, role FROM users");
        console.log(users);
    } catch (e) {
        console.error("Error occurred:", e);
    } finally {
        await pool.end();
    }
}

test();

const pool = require('../config/db');

async function test() {
    try {
        console.log("SHOW CREATE TABLE comments:");
        const [rows] = await pool.query("SHOW CREATE TABLE comments");
        console.log(rows[0]['Create Table']);
        
        console.log("\nSHOW CREATE TABLE users:");
        const [users] = await pool.query("SHOW CREATE TABLE users");
        console.log(users[0]['Create Table']);
    } catch (e) {
        console.error("Error occurred:", e);
    } finally {
        await pool.end();
    }
}

test();

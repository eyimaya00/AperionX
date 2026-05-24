const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function reproduce() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected to DB");

        // Find an article to test on (limit 1)
        const [rows] = await connection.query("SELECT id, status FROM articles LIMIT 1");
        if (rows.length === 0) {
            console.log("No articles found to test.");
            return;
        }
        const id = rows[0].id;
        console.log(`Testing on article ${id}, current status: ${rows[0].status}`);

        // Try update
        await connection.query("UPDATE articles SET status = 'trash' WHERE id = ?", [id]);
        console.log("Update success!");

        // Check new status
        const [rows2] = await connection.query("SELECT id, status FROM articles WHERE id = ?", [id]);
        console.log(`New status: ${rows2[0].status}`);

        // Revert (optional, or leave as trash)
        // await connection.query("UPDATE articles SET status = ? WHERE id = ?", [rows[0].status, id]);

    } catch (e) {
        console.error("ERROR CAUGHT:");
        console.error(e);
    }
    finally { if (connection) connection.end(); }
}
reproduce();

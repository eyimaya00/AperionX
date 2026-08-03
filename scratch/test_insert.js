const pool = require('../config/db');

async function run() {
    try {
        const userId = 25; // a valid user_id from recent likes
        const experimentId = 1; // test experiment
        
        console.log("Attempting to insert like...");
        const [res] = await pool.query('INSERT INTO likes (experiment_id, user_id) VALUES (?, ?)', [experimentId, userId]);
        console.log("Insert result:", res);

        console.log("Selecting it back...");
        const [rows] = await pool.query('SELECT * FROM likes WHERE experiment_id = ? AND user_id = ?', [experimentId, userId]);
        console.log("Selected row:", rows);

        console.log("Deleting it...");
        const [del] = await pool.query('DELETE FROM likes WHERE experiment_id = ? AND user_id = ?', [experimentId, userId]);
        console.log("Delete result:", del);

        process.exit(0);
    } catch (e) {
        console.error("Test failed:", e);
        process.exit(1);
    }
}

run();

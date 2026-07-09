const pool = require('../config/db');

async function run() {
    try {
        console.log("Modifying article_id to NULL...");
        await pool.query("ALTER TABLE likes MODIFY COLUMN article_id INT NULL");
        console.log("Checking if experiment_id exists in likes...");
        const [expCol] = await pool.query("SHOW COLUMNS FROM likes LIKE 'experiment_id'");
        if (expCol.length === 0) {
            console.log("Adding experiment_id to likes...");
            await pool.query("ALTER TABLE likes ADD COLUMN experiment_id INT NULL AFTER article_id");
        } else {
            console.log("experiment_id already exists.");
        }
        console.log("Checking for unique_experiment_like index...");
        const [indexes] = await pool.query("SHOW INDEX FROM likes WHERE Key_name = 'unique_experiment_like'");
        if (indexes.length === 0) {
            console.log("Adding unique_experiment_like index...");
            await pool.query("ALTER TABLE likes ADD UNIQUE KEY unique_experiment_like (user_id, experiment_id)");
        } else {
            console.log("unique_experiment_like index already exists.");
        }
        console.log("Migration completed successfully!");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}

run();

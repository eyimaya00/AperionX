const pool = require('../config/db');

async function migrate() {
    try {
        console.log("Starting email_logs table migration...");
        
        // 1. Make article_id nullable
        // We first need to check the foreign key name and columns.
        // It's constraint: email_logs_ibfk_1
        console.log("Modifying article_id to be NULL...");
        await pool.query("ALTER TABLE email_logs MODIFY COLUMN article_id INT NULL");
        
        // 2. Add experiment_id column
        console.log("Checking if experiment_id exists...");
        const [cols] = await pool.query("SHOW COLUMNS FROM email_logs LIKE 'experiment_id'");
        if (cols.length === 0) {
            console.log("Adding experiment_id column...");
            await pool.query("ALTER TABLE email_logs ADD COLUMN experiment_id INT NULL");
            console.log("Adding foreign key constraint for experiment_id...");
            await pool.query("ALTER TABLE email_logs ADD CONSTRAINT fk_email_logs_experiment FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE");
        } else {
            console.log("experiment_id column already exists.");
        }
        
        console.log("Migration completed successfully!");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await pool.end();
    }
}

migrate();

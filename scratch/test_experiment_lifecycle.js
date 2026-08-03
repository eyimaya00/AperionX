require('dotenv').config();
const pool = require('../config/db');

async function test() {
    try {
        console.log("=== STARTING EXPERIMENT LIFECYCLE TEST ===");
        
        // 1. Insert a mock author user if not exists, or find one
        const [users] = await pool.query("SELECT id, fullname, role FROM users WHERE role = 'author' LIMIT 1");
        if (users.length === 0) {
            console.log("No author user found in database. Cannot run test.");
            return;
        }
        const author = users[0];
        console.log(`Using Author: ${author.fullname} (ID: ${author.id})`);

        // Find an editor or admin user
        const [editors] = await pool.query("SELECT id, fullname FROM users WHERE role IN ('editor', 'admin') LIMIT 1");
        if (editors.length === 0) {
            console.log("No editor/admin user found in database.");
            return;
        }
        const editor = editors[0];
        console.log(`Using Editor: ${editor.fullname} (ID: ${editor.id})`);

        // 2. Create Experiment (Simulate POST /api/experiments)
        console.log("\n1. Creating experiment with status 'pending'...");
        const title = "Lifecycle Test Experiment " + Date.now();
        const [insertResult] = await pool.query(
            `INSERT INTO experiments (title, slug, excerpt, status, author_id)
             VALUES (?, ?, ?, ?, ?)`,
            [title, 'lifecycle-test-' + Date.now(), 'Test Excerpt', 'pending', author.id]
        );
        const expId = insertResult.insertId;
        console.log(`Experiment created with ID: ${expId}`);

        // 3. Fetch as Author (Simulate GET /api/author/experiments)
        console.log("\n2. Fetching experiments for author...");
        const [authorExpsBefore] = await pool.query(`
            SELECT id, title, status, rejection_reason FROM experiments 
            WHERE author_id = ? AND deleted_at IS NULL
        `, [author.id]);
        console.log(`Found ${authorExpsBefore.length} experiments.`);
        const myExpBefore = authorExpsBefore.find(e => e.id === expId);
        if (myExpBefore) {
            console.log(`  -> Experiment visible to author. Status: '${myExpBefore.status}'`);
        } else {
            console.error("  -> ERROR: Experiment NOT visible to author!");
        }

        // 4. Reject as Editor (Simulate PUT /api/editor/experiments/decide/:id)
        console.log("\n3. Rejecting experiment as editor...");
        await pool.query(
            "UPDATE experiments SET status = 'rejected', approved_by = ?, rejection_reason = ? WHERE id = ?",
            [editor.id, 'Test rejection reason', expId]
        );
        console.log("Experiment status set to 'rejected'.");

        // 5. Fetch as Author after rejection
        console.log("\n4. Fetching experiments for author after rejection...");
        const [authorExpsAfter] = await pool.query(`
            SELECT id, title, status, rejection_reason FROM experiments 
            WHERE author_id = ? AND deleted_at IS NULL
        `, [author.id]);
        const myExpAfter = authorExpsAfter.find(e => e.id === expId);
        if (myExpAfter) {
            console.log(`  -> Experiment visible to author. Status: '${myExpAfter.status}'`);
            console.log(`  -> Rejection Reason: '${myExpAfter.rejection_reason}'`);
        } else {
            console.error("  -> ERROR: Experiment NOT visible to author after rejection!");
        }

        // 6. Resubmit as Author (Simulate PUT /api/experiments/:id)
        console.log("\n5. Resubmitting experiment as author...");
        // In real app, the author sends PUT with status = 'pending' (which is converted to 'pending' by backend)
        await pool.query(
            "UPDATE experiments SET status = 'pending' WHERE id = ?",
            [expId]
        );
        console.log("Experiment resubmitted (status set to 'pending').");

        // 7. Check if rejection_reason is cleared on resubmission
        console.log("\n6. Checking experiment in DB after resubmission...");
        const [expCheck] = await pool.query("SELECT id, status, rejection_reason FROM experiments WHERE id = ?", [expId]);
        console.log(`  -> Status: '${expCheck[0].status}'`);
        console.log(`  -> Rejection Reason: '${expCheck[0].rejection_reason}'`);
        if (expCheck[0].rejection_reason !== null) {
            console.warn("  -> WARNING: Rejection reason was NOT cleared on resubmission!");
        } else {
            console.log("  -> Rejection reason cleared successfully.");
        }

        // 8. Clean up
        console.log("\nCleaning up test data...");
        await pool.query("DELETE FROM experiments WHERE id = ?", [expId]);
        console.log("Cleanup finished.");

    } catch (e) {
        console.error("Test Error:", e);
    } finally {
        pool.end();
    }
}

test();

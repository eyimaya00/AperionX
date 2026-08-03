require('dotenv').config();
const pool = require('../config/db');

async function verify() {
    try {
        console.log("=== VERIFYING BACKEND ENDPOINTS ===");

        // Fetch an author user
        const [users] = await pool.query("SELECT id, fullname FROM users WHERE role = 'author' LIMIT 1");
        if (users.length === 0) {
            console.log("No author user found in database. Skipping verification.");
            return;
        }
        const author = users[0];
        console.log(`Using Author: ${author.fullname} (ID: ${author.id})`);

        // Create a dummy experiment with author as co-author (but creator as another user, or dummy creator)
        const [otherUsers] = await pool.query("SELECT id FROM users WHERE id != ? LIMIT 1", [author.id]);
        let creatorId = author.id;
        if (otherUsers.length > 0) {
            creatorId = otherUsers[0].id;
        }
        console.log(`Creator ID of test experiment: ${creatorId}`);

        const testTitle = "Co-authored test experiment " + Date.now();
        const [insExp] = await pool.query(
            "INSERT INTO experiments (title, slug, excerpt, status, author_id) VALUES (?, ?, ?, ?, ?)",
            [testTitle, 'co-author-test-' + Date.now(), 'Excerpt', 'published', creatorId]
        );
        const expId = insExp.insertId;

        // Add author as co-author
        await pool.query(
            "INSERT INTO experiment_authors (experiment_id, user_id, order_index) VALUES (?, ?, ?)",
            [expId, author.id, 1]
        );
        console.log(`Created experiment ${expId} and added author ${author.id} as co-author.`);

        // Test 1: GET /api/author/experiments query simulation
        const [rowsExps] = await pool.query(`
            SELECT DISTINCT e.* FROM experiments e
            LEFT JOIN experiment_authors ea ON e.id = ea.experiment_id
            WHERE (e.author_id = ? OR ea.user_id = ?) AND e.deleted_at IS NULL
        `, [author.id, author.id]);
        const foundExp = rowsExps.find(e => e.id === expId);
        if (foundExp) {
            console.log("Test 1 (/api/author/experiments query): SUCCESS - Co-authored experiment is returned!");
        } else {
            console.error("Test 1 (/api/author/experiments query): FAILED - Co-authored experiment was NOT returned!");
        }

        // Test 2: GET /api/author/stats query simulation
        const [expPublishedRes] = await pool.query(`
            SELECT COUNT(DISTINCT e.id) as count FROM experiments e
            LEFT JOIN experiment_authors ea ON e.id = ea.experiment_id
            WHERE (e.author_id = ? OR ea.user_id = ?) AND e.status = 'published' AND e.deleted_at IS NULL
        `, [author.id, author.id]);
        console.log(`Test 2 (/api/author/stats published count): SUCCESS - Count returned: ${expPublishedRes[0].count}`);

        // Test 3: GET /api/author/analytics query simulation
        const [items] = await pool.query(`
            SELECT DISTINCT
                e.id, e.title, e.created_at, e.views, 'experiment' as type,
                0 as likes,
                0 as comments
            FROM experiments e
            LEFT JOIN experiment_authors ea ON e.id = ea.experiment_id
            WHERE (e.author_id = ? OR ea.user_id = ?) AND e.status = 'published' AND e.deleted_at IS NULL
        `, [author.id, author.id]);
        const foundAnalytic = items.find(e => e.id === expId);
        if (foundAnalytic) {
            console.log("Test 3 (/api/author/analytics UNION part query): SUCCESS - Co-authored experiment is returned!");
        } else {
            console.error("Test 3 (/api/author/analytics UNION part query): FAILED - Co-authored experiment was NOT returned!");
        }

        // Clean up
        console.log("Cleaning up test co-author and experiment...");
        await pool.query("DELETE FROM experiment_authors WHERE experiment_id = ?", [expId]);
        await pool.query("DELETE FROM experiments WHERE id = ?", [expId]);
        console.log("Verification finished successfully!");

    } catch (e) {
        console.error("Verification Error:", e);
    } finally {
        pool.end();
    }
}

verify();

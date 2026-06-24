const pool = require('./config/db');

async function run() {
    try {
        console.log("--- 1. ORPHANED VIEW COUNTS ---");
        const [orphans] = await pool.query(
            "SELECT article_id, COUNT(*) as view_count FROM article_views WHERE article_id NOT IN (SELECT id FROM articles) GROUP BY article_id"
        );
        console.log("Orphaned article IDs and their view counts:", orphans);

        console.log("\n--- 2. ORPHANED COMMENTS ---");
        const [orphanedComments] = await pool.query(
            "SELECT article_id, COUNT(*) as comment_count FROM comments WHERE article_id NOT IN (SELECT id FROM articles) GROUP BY article_id"
        );
        console.log("Orphaned comment counts:", orphanedComments);

        console.log("\n--- 3. TRACKED AUTHOR ARTICLES ---");
        const [trackedMatches] = await pool.query(
            "SELECT * FROM tracked_author_articles WHERE title LIKE '%Fragile%' OR title LIKE '%Sendromu%'"
        );
        console.log("Matches in tracked_author_articles:", trackedMatches);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();

const pool = require('../config/db');

async function searchBroad() {
    try {
        const [rows] = await pool.query("SELECT id, title, slug, image_url, status FROM articles WHERE title LIKE '%insan%' OR title LIKE '%köken%' OR title LIKE '%neandertal%' OR title LIKE '%denisova%' OR slug LIKE '%insan%' OR slug LIKE '%koken%'");
        console.log("Broad Search Results:");
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error("Error checking database:", e);
    } finally {
        await pool.end();
    }
}

searchBroad();

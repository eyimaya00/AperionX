const axios = require('axios');
const pool = require('../config/db');

async function test() {
    try {
        const [articles] = await pool.query("SELECT id, slug, title FROM articles");
        console.log(`Found ${articles.length} articles.`);
        
        for (const art of articles) {
            try {
                const url = `http://localhost:80/api/articles/${art.id}/comments`;
                const res = await axios.get(url);
                console.log(`Article ID ${art.id} (${art.title}): Status ${res.status}, comments count: ${res.data.length}`);
            } catch (err) {
                console.error(`Article ID ${art.id} (${art.title}) FAILED:`, err.response ? err.response.status : err.message, err.response ? err.response.data : '');
            }
        }
        
        // Also test null/slug parameter
        try {
            const url = `http://localhost:80/api/articles/null/comments`;
            const res = await axios.get(url);
            console.log(`Article ID null: Status ${res.status}`);
        } catch (err) {
            console.error(`Article ID null FAILED:`, err.response ? err.response.status : err.message, err.response ? err.response.data : '');
        }

        try {
            const url = `http://localhost:80/api/articles/some-slug/comments`;
            const res = await axios.get(url);
            console.log(`Article ID slug: Status ${res.status}`);
        } catch (err) {
            console.error(`Article ID slug FAILED:`, err.response ? err.response.status : err.message, err.response ? err.response.data : '');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

test();

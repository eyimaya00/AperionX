const axios = require('axios');

async function testEndpoint() {
    try {
        // We'll trust the running server on localhost:3000
        // But we need a token. We can't easily get one without login.
        // So we might need to mock or just check if it returns 404 vs 401.
        // 401 means the route exists (middleware hit).
        // 404 means route does not exist.

        console.log("Testing /api/articles/my-articles...");
        try {
            await axios.get('http://localhost:3000/api/articles/my-articles');
        } catch (e) {
            console.log("Status:", e.response ? e.response.status : e.message);
            if (e.response && e.response.data) {
                console.log("Data:", e.response.data);
            }
        }
    } catch (err) {
        console.error("Test failed:", err);
    }
}

testEndpoint();

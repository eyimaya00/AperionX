
// Native fetch is used in Node 18+

async function testApi() {
    try {
        console.log("Testing /api/articles...");
        const res = await fetch('http://localhost:3000/api/articles');
        if (!res.ok) {
            console.error("API Error status:", res.status);
            const txt = await res.text();
            console.error("Body:", txt);
        } else {
            const data = await res.json();
            console.log("Success! Got " + data.length + " articles.");
            if (data.length > 0) {
                console.log("First article:", data[0]);
            }
        }
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}

testApi();

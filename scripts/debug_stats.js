// Native fetch used


async function testStats() {
    try {
        // 1. Login to get token (assuming admin or editor)
        const loginRes = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@aperionx.com', password: 'admin' })
        });

        // If admin login fails, try a known author/editor if possible, or just print error
        if (!loginRes.ok) {
            console.error('Login failed:', await loginRes.text());
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('Login successful. Token obtained.');

        // 2. Fetch Stats
        const statsRes = await fetch('http://localhost:3000/api/editor/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!statsRes.ok) {
            console.error('Stats fetch failed:', await statsRes.text());
            return;
        }

        const stats = await statsRes.json();
        console.log('Stats Response Keys:', Object.keys(stats));

        if (stats.articles) {
            console.log('Articles found:', stats.articles.length);
            if (stats.articles.length > 0) {
                console.log('First article sample:', stats.articles[0]);
            }
        } else {
            console.error('CRITICAL: "articles" key is MISSING in response!');
        }

    } catch (e) {
        console.error('Test error:', e);
    }
}

testStats();

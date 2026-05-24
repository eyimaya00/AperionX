const axios = require('axios');

async function test() {
    try {
        // 1. LOGIN
        const loginRes = await axios.post('http://localhost:3000/api/login', {
            identifier: 'emrullah@aperionx.com',
            password: 'password123'
        });

        const token = loginRes.data.token;
        console.log('Login successful, token:', token.substring(0, 20) + '...');

        // 2. GET MY ARTICLES
        console.log('\nTesting /api/articles/my-articles...');
        try {
            const myArticlesRes = await axios.get('http://localhost:3000/api/articles/my-articles', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`Success! Articles: ${myArticlesRes.data.length}`);
        } catch (e) {
            console.error('MyArticles Error:', e.response ? e.response.status : e.message, e.response ? e.response.data : '');
        }

        // 3. GET AUTHOR STATS
        console.log('\nTesting /api/author/stats...');
        try {
            const statsRes = await axios.get('http://localhost:3000/api/author/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Success! Stats:', statsRes.data);
        } catch (e) {
            console.error('Stats Error:', e.response ? e.response.status : e.message, e.response ? e.response.data : '');
        }

        // 4. GET NOTIFICATIONS
        console.log('\nTesting /api/notifications...');
        try {
            const notifRes = await axios.get('http://localhost:3000/api/notifications', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Success! Unread:', notifRes.data.unread);
        } catch (e) {
            console.error('Notifications Error:', e.response ? e.response.status : e.message, e.response ? e.response.data : '');
        }

    } catch (e) {
        console.error('Login/Setup Error:', e.response ? e.response.data : e.message);
    }
}

test();

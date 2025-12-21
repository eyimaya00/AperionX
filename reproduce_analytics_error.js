const axios = require('axios');

async function test() {
    try {
        // 1. LOGIN
        const loginRes = await axios.post('http://localhost:3000/api/login', {
            identifier: 'emrullah@aperionx.com',
            password: 'password123'
        });

        const token = loginRes.data.token;
        console.log('Login successful');

        // 2. GET ANALYTICS
        console.log('\nTesting /api/author/analytics...');
        try {
            const res = await axios.get('http://localhost:3000/api/author/analytics', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Success! Analytics loaded.');
        } catch (e) {
            console.error('Analytics Error:', e.response ? e.response.status : e.message, e.response ? e.response.data : '');
        }

        // 3. GET COMMENTS
        console.log('\nTesting /api/author/comments...');
        try {
            const res = await axios.get('http://localhost:3000/api/author/comments', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`Success! Comments loaded: ${res.data.length}`);
        } catch (e) {
            console.error('Comments Error:', e.response ? e.response.status : e.message, e.response ? e.response.data : '');
        }

    } catch (e) {
        console.error('Login Error:', e.message);
    }
}

test();

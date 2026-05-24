const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testProfileAccess() {
    try {
        // 1. Register a new reader
        const username = 'testreader_' + Date.now();
        const email = `${username}@example.com`;
        const password = 'password123';

        console.log(`[TEST] Registering user: ${username}`);
        await axios.post(`${API_URL}/register`, {
            fullname: 'Test Reader',
            email: email,
            username: username,
            password: password
        });

        // 2. Login
        console.log('[TEST] Logging in...');
        const loginRes = await axios.post(`${API_URL}/login`, {
            identifier: email,
            password: password
        });

        const token = loginRes.data.token;
        console.log('[TEST] Login successful. Token obtained.');

        // 3. Access Liked Articles
        console.log('[TEST] Accessing /api/user/liked-articles...');
        try {
            const likedRes = await axios.get(`${API_URL}/user/liked-articles`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`[PASS] Liked Articles Status: ${likedRes.status}`);
        } catch (e) {
            console.error(`[FAIL] Liked Articles: ${e.response ? e.response.status : e.message}`);
        }

        // 4. Access Comments
        console.log('[TEST] Accessing /api/user/comments...');
        try {
            const commentsRes = await axios.get(`${API_URL}/user/comments`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`[PASS] Comments Status: ${commentsRes.status}`);
        } catch (e) {
            console.error(`[FAIL] Comments: ${e.response ? e.response.status : e.message}`);
        }

    } catch (error) {
        console.error('[CRITICAL FAIL] Test setup failed:', error.message);
        if (error.response) console.error('Response data:', error.response.data);
    }
}

testProfileAccess();

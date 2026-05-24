const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:3000/api';

async function testSettings() {
    try {
        console.log('Testing GET /api/settings...');
        const res = await axios.get(`${API_URL}/settings`);
        console.log('GET /api/settings success:', res.data);
    } catch (e) {
        console.error('GET /api/settings failed:', e.response ? e.response.status : e.message);
    }

    try {
        console.log('Testing POST /api/settings...');
        // Need a token ideally, but let's see if 404 comes before 401
        // Usually middleware runs first. If route doesn't exist, express returns 404.
        // If route exists but needs auth, 401/403.
        const res = await axios.post(`${API_URL}/settings`, { site_title: 'Test' });
        console.log('POST /api/settings success:', res.data);
    } catch (e) {
        console.error('POST /api/settings failed:', e.response ? e.response.status : e.message);
    }
}

testSettings();

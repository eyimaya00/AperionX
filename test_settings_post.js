const fetch = require('node-fetch');
const FormData = require('form-data');

// Use the token hardcoded or retrieved from a known valid session if possible.
// Since we are running in node, we'll manually authenticate or simulate it.
// Wait, we need a valid token. Let's use the login endpoint first.

const API_URL = 'http://localhost:3000/api';

async function testPost() {
    try {
        // 1. Login
        const loginRes = await fetch(`${API_URL}/login`, {
            method: 'POST',
            body: JSON.stringify({ email: 'admin@aperionx.com', password: '123456' }),
            headers: { 'Content-Type': 'application/json' }
        });
        const loginData = await loginRes.json();
        const token = loginData.token;

        if (!token) {
            console.error('Login failed:', loginData);
            return;
        }

        console.log('Login successful, token:', token);

        // 2. Post Settings simulating Admin Panel FormData
        const form = new FormData();
        form.append('site_title', 'AperionX Test');
        form.append('contact_email', 'newemail@test.com');

        const res = await fetch(`${API_URL}/settings`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                // FormData headers (boundary) are managed by the form-data library
                ...form.getHeaders()
            },
            body: form
        });

        const data = await res.json();
        console.log('Post response:', data);

    } catch (e) {
        console.error(e);
    }
}

testPost();

// Native fetch and FormData in Node v18+
const fs = require('fs');

const API_URL = 'http://localhost:3000/api';

async function test() {
    try {
        console.log('Logging in...');
        const loginRes = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@aperion.com', password: '123admin' })
        });
        const loginData = await loginRes.json();
        console.log('Login:', loginRes.status, loginData.message);
        const token = loginData.token;

        if (!token) return;

        console.log('Creating Article...');
        const form = new FormData();
        form.append('title', 'Test Article');
        form.append('excerpt', 'Test Excerpt');
        form.append('content', 'Test Content');
        // Optional: append a file if needed, but testing text first

        const res = await fetch(`${API_URL}/articles`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }, // form-data headers handled by lib?
            body: form
        });

        const data = await res.json();
        console.log('Create Article:', res.status, data);

    } catch (e) {
        console.error(e);
    }
}

test();

// Native fetch and FormData in Node 22
const fs = require('fs');
const API_URL = 'http://localhost:3000/api';

async function testFlow() {
    try {
        console.log('Starting Native FormData Test...');
        const email = `author_${Date.now()}@test.com`;
        const password = 'password123';

        // Register
        await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullname: 'Test Author', email, password })
        });

        // Login
        const loginRes = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('Login successful.');

        // Create Article using Native FormData
        const form = new FormData();
        form.append('title', 'Test Native FormData');
        form.append('category', 'Teknoloji');
        form.append('excerpt', 'Native Excerpt');
        form.append('content', 'Native Content');
        form.append('status', 'published'); // Trying to publish as author should result in 'pending'

        const res = await fetch(`${API_URL}/articles`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: form
        });

        const text = await res.text();
        console.log(`Response Status: ${res.status}`);
        console.log(`Response Body: ${text}`);

    } catch (e) {
        console.error('Test script error:', e);
    }
}

testFlow();

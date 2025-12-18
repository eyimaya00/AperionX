const fetch = require('node-fetch');
const FormData = require('form-data');

async function testSettings() {
    try {
        //Login first to get token
        const loginRes = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@aperionx.com', password: 'admin' }) // Assuming default admin
        });
        const loginData = await loginRes.json();
        const token = loginData.token;

        if (!token) {
            console.error('Login failed');
            return;
        }

        const form = new FormData();
        form.append('homepage_hero_title', 'Test Title');

        const res = await fetch('http://localhost:3000/api/settings', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: form
        });

        console.log('Status:', res.status);
        const txt = await res.text();
        console.log('Body:', txt);

    } catch (e) {
        console.error(e);
    }
}

testSettings();

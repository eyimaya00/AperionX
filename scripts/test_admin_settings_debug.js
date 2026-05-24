const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASS = 'admin123'; // Assuming default or will try to create

async function testAdminSettings() {
    try {
        // 1. Login (or Register first if mostly likely needed, but let's try login)
        console.log('Attempting login...');
        let token;
        try {
            const loginRes = await axios.post(`${BASE_URL}/api/login`, {
                identifier: ADMIN_EMAIL,
                password: ADMIN_PASS
            });
            token = loginRes.data.token;
            console.log('Login successful. Token obtained.');
        } catch (e) {
            console.log('Login failed (' + e.message + '). Attempting to register admin...');
            try {
                await axios.post(`${BASE_URL}/api/register`, {
                    fullname: 'Admin Test',
                    email: ADMIN_EMAIL,
                    password: ADMIN_PASS,
                    username: 'admintest'
                });
                // Then try force promoting to admin via DB if possible? 
                // Actually server doesn't allow registering as admin directly usually.
                // Let's rely on existing admin or manual DB inject if this fails.
                // For now, let's assume valid admin credentials or I will fix this step.

                // Re-login
                const loginRes = await axios.post(`${BASE_URL}/api/login`, {
                    identifier: ADMIN_EMAIL,
                    password: ADMIN_PASS
                });
                token = loginRes.data.token;
            } catch (regErr) {
                console.error('Registration/Login recovery failed:', regErr.response?.data || regErr.message);
                return;
            }
        }

        // 2. Fetch Settings
        console.log('Fetching settings...');
        const getRes = await axios.get(`${BASE_URL}/api/settings`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Current Settings Keys:', Object.keys(getRes.data));

        // 3. Update Settings
        console.log('Updating settings...');
        const updatePayload = {
            site_title: 'AperionX Test Update ' + Date.now(),
            maintenance_mode: 'false'
        };
        const updateRes = await axios.post(`${BASE_URL}/api/settings`, updatePayload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Update Status:', updateRes.status);
        console.log('Update Response:', updateRes.data);

        // 4. Verify Update
        const verifyRes = await axios.get(`${BASE_URL}/api/settings`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (verifyRes.data.site_title === updatePayload.site_title) {
            console.log('SUCCESS: Settings updated and verified.');
        } else {
            console.error('FAILURE: Settings mismatch.', {
                expected: updatePayload.site_title,
                actual: verifyRes.data.site_title
            });
        }

    } catch (error) {
        console.error('Test Failed:', error.response?.data || error.message);
    }
}

testAdminSettings();

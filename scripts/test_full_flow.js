const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@aperion.com';
const ADMIN_PASS = 'admin123';

const AUTHOR_EMAIL = 'author_verify_' + Date.now() + '@example.com';
const AUTHOR_PASS = 'author123';

async function runVerification() {
    try {
        console.log('--- STARTING VERIFICATION ---');

        // 1. Login as Admin
        console.log('[1] Logging in as Admin...');
        const adminLogin = await axios.post(`${BASE_URL}/api/login`, { identifier: ADMIN_EMAIL, password: ADMIN_PASS });
        const adminToken = adminLogin.data.token;
        console.log('✅ Admin Logged In');

        // 2. Test Settings V2 (Admin)
        console.log('[2] Testing Admin Settings V2 Save...');
        const settingsForm = new FormData();
        settingsForm.append('site_title', 'AperionX - Verified ' + Date.now());
        settingsForm.append('maintenance_mode', 'false');
        // We won't upload a file in this test to keep it simple, but the endpoint supports it.

        await axios.post(`${BASE_URL}/api/settings_v2`, settingsForm, {
            headers: { ...settingsForm.getHeaders(), Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ Settings V2 Saved Successfully');


        // 3. Create & Login Author
        console.log('[3] Creating new Author...');
        // Create user via Admin API
        await axios.post(`${BASE_URL}/api/admin/users`, {
            fullname: 'Verify Author',
            email: AUTHOR_EMAIL,
            password: AUTHOR_PASS,
            role: 'author'
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        console.log('✅ Author Created');

        console.log('[4] Logging in as Author...');
        const authorLogin = await axios.post(`${BASE_URL}/api/login`, { identifier: AUTHOR_EMAIL, password: AUTHOR_PASS });
        const authorToken = authorLogin.data.token;
        console.log('✅ Author Logged In');


        // 4. Test Draft Creation (Author)
        console.log('[5] Testing Author Draft Creation...');
        const draftForm = new FormData();
        draftForm.append('title', 'Draft Verification Article');
        draftForm.append('content', '<p>Draft Content</p>');
        draftForm.append('status', 'draft');
        draftForm.append('category', 'Technology');
        draftForm.append('tags', 'test, draft');

        const draftRes = await axios.post(`${BASE_URL}/api/articles`, draftForm, {
            headers: { ...draftForm.getHeaders(), Authorization: `Bearer ${authorToken}` }
        });
        if (draftRes.data.status !== 'draft') throw new Error('Expected status draft, got ' + draftRes.data.status);
        console.log('✅ Draft Created with status: ' + draftRes.data.status);


        // 5. Test Publish Flow (Author -> Pending)
        console.log('[6] Testing Author Publish Request (Should be Pending)...');
        const pubForm = new FormData();
        pubForm.append('title', 'Pending Verification Article');
        pubForm.append('content', '<p>Pending Content</p>');
        pubForm.append('status', 'published'); // Requesting published
        pubForm.append('category', 'Science');

        const pubRes = await axios.post(`${BASE_URL}/api/articles`, pubForm, {
            headers: { ...pubForm.getHeaders(), Authorization: `Bearer ${authorToken}` }
        });

        if (pubRes.data.status !== 'pending') throw new Error('Expected status pending for author, got ' + pubRes.data.status);
        console.log('✅ Article Submitted with enforced status: ' + pubRes.data.status);

        console.log('--- VERIFICATION SUCCESSFUL ---');

    } catch (e) {
        console.error('❌ VERIFICATION FAILED:', e.message);
        if (e.response) console.error('Response Data:', e.response.data);
    }
}

runVerification();

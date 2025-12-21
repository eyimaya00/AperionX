const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:3000';
// Assuming we have an author user. If not, we might need to create one or use existing.
// Let's rely on 'admin' for now but ideally should be 'author'. 
// But the issue is specifically about 'author' role logic.
// I will create a temporary author user.

const AUTHOR_EMAIL = 'author_test_' + Date.now() + '@example.com';
const AUTHOR_PASS = 'author123';

async function testAuthorFlow() {
    try {
        console.log('1. Registering new author:', AUTHOR_EMAIL);
        await axios.post(`${BASE_URL}/api/admin/users`, { // Using admin endpoint logic? No, let's use public register then promote? 
            // Wait, I can just register and manually update DB or use admin to create.
            // Let's try public register.
            fullname: 'Test Author',
            email: AUTHOR_EMAIL,
            password: AUTHOR_PASS,
            username: 'author_' + Date.now()
        }).catch(() => { }); // If fails (already exists), ignore.

        // Need admin to promote this user to author? Or does user start as 'reader'?
        // Assuming default is reader. I need an ADMIN token to promote.

        // Let's just login as ADMIN first to create the user properly with role 'author'.
        const adminLogin = await axios.post(`${BASE_URL}/api/login`, { identifier: 'admin@example.com', password: 'admin123' });
        const adminToken = adminLogin.data.token;

        await axios.post(`${BASE_URL}/api/admin/users`, {
            fullname: 'Test Author',
            email: AUTHOR_EMAIL,
            password: AUTHOR_PASS,
            role: 'author'
        }, { headers: { Authorization: `Bearer ${adminToken}` } });

        console.log('2. Logging in as Author...');
        const loginRes = await axios.post(`${BASE_URL}/api/login`, {
            identifier: AUTHOR_EMAIL,
            password: AUTHOR_PASS
        });
        const token = loginRes.data.token;
        const userId = loginRes.data.user.id;
        console.log('Logged in. User ID:', userId);

        // 3. Create Draft
        console.log('3. Creating Draft Article...');
        const formDraft = new FormData();
        formDraft.append('title', 'Test Draft Article');
        formDraft.append('content', '<p>Draft content</p>');
        formDraft.append('status', 'draft');

        await axios.post(`${BASE_URL}/api/articles`, formDraft, {
            headers: { ...formDraft.getHeaders(), Authorization: `Bearer ${token}` }
        });
        console.log('Draft created.');

        // Verify status in DB (via API)
        const myArticles = await axios.get(`${BASE_URL}/api/articles/my-articles`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const draftArticle = myArticles.data.find(a => a.title === 'Test Draft Article');
        console.log('Draft Status verification:', draftArticle ? draftArticle.status : 'NOT FOUND');

        // 4. Create Published (Should be Pending)
        console.log('4. Creating Published Article (Expect Pending)...');
        const formPub = new FormData();
        formPub.append('title', 'Test Publish Article');
        formPub.append('content', '<p>Publish content</p>');
        formPub.append('status', 'published');

        await axios.post(`${BASE_URL}/api/articles`, formPub, {
            headers: { ...formPub.getHeaders(), Authorization: `Bearer ${token}` }
        });

        // Verify status
        const myArticles2 = await axios.get(`${BASE_URL}/api/articles/my-articles`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const pendingArticle = myArticles2.data.find(a => a.title === 'Test Publish Article');
        console.log('Pending Status verification:', pendingArticle ? pendingArticle.status : 'NOT FOUND');

    } catch (e) {
        console.error('Test Failed:', e.response?.data || e.message);
    }
}

testAuthorFlow();

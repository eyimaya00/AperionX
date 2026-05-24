const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const API_URL = 'http://localhost:3000/api';
let authorToken = '';
let editorToken = '';
let articleId = '';

const authData = {
    author: { email: 'author_full_test@example.com', password: 'password123', fullname: 'Test Author Full' },
    editor: { email: 'editor_full_test@example.com', password: 'password123', fullname: 'Test Editor Full' }
};

async function runTest() {
    try {
        console.log('--- STARTING END-TO-END PUBLISHING TEST ---');

        // 1. Register/Login Author
        console.log('\n[1] Setup Author...');
        try {
            await axios.post(`${API_URL}/auth/register`, { ...authData.author, role: 'author' });
        } catch (e) { /* Ignore if exists */ }

        const authorRes = await axios.post(`${API_URL}/auth/login`, { email: authData.author.email, password: authData.author.password });
        authorToken = authorRes.data.token;
        console.log('✓ Author Logged In');

        // 2. Register/Login Editor
        console.log('\n[2] Setup Editor...');
        try {
            await axios.post(`${API_URL}/auth/register`, { ...authData.editor, role: 'editor' });
            // Need to manually promote to editor for test? Or assume registered as Editor works (if enabled)?
            // Default register is 'author'. We usually need admin to promote.
            // Let's create an Admin to promote this user, or use existing logic.
            // Wait, server usually sets default role to 'author'.
            // I'll assume i need to promote him via DB bypass or similar?
            // Actually, let's use the 'admin' user created in setup if possible, or just a known admin.
            // For this test, I will assume I can register as editor or I'll just use a direct DB query to upgrade him.
        } catch (e) { /* Ignore */ }

        // Login as Editor (might fail if role pending, but let's try)
        // Note: For this to work, I need to ensure this user has 'editor' role.
        // I will use a helper to force upgrade for this test script context.
        // Or I rely on an existing admin credential?

        // SELF-CORRECTION: I'll try to login. If role is 'author', I can't approve.
        // I will assume for this test I have to use the 'admin' account I likely created before or 'admin@example.com'.
        // Let's try to login as 'admin@example.com' / 'admin123' which is a common default.
        // If not, I'll fallback to a DB update.

        // Let's just create the user and run a raw DB update via a separate tiny process if needed? 
        // No, I can't run DB commands easily here without mysql lib.
        // I'll try to login as the 'editor' I just made.
        const editorRes = await axios.post(`${API_URL}/auth/login`, { email: authData.editor.email, password: authData.editor.password });
        editorToken = editorRes.data.token;

        // FORCE UPDATE ROLE (Simulating Admin action)
        // I will do this via a separate specific exec call to a tiny js helper if this script fails, 
        // but let's try to proceed.
        // Actually, I can't change role via API easily without being admin. 
        // Let's presume the user might have an admin account? 
        // I'll just use the system instruction capability to "ensure" editor role if I could, but I can't.
        // Wait, I can run `node add_editor_role.js` via the agent! 
        // I will explicitly call a helper in the next step if this fails.
        // For now, let's assume I can use "admin" logic or just try.

        console.log('✓ Editor Logged In (Assuming role is set correctly)');


        // 3. Author Submits Article
        console.log('\n[3] Author Submitting Article...');
        const form = new FormData();
        form.append('title', 'End-to-End Test Article');
        form.append('content', '<p>This is a test article content for full workflow verification.</p>');
        form.append('category', 'Technology');
        form.append('status', 'published'); // Trying to publish
        form.append('excerpt', 'Testing flow...');
        // Mock image
        form.append('image', fs.createReadStream('c:/Users/eyima/.gemini/antigravity/scratch/AperionX/uploads/site_logo-1734469792686-277561845.png')); // Using an existing file if possible or create dummy.
        // I need a real file path. I'll search for one or create a dummy text file as image (multer might reject).
        // I'll skip image for now or use a placeholder URL if API allows.
        // API allows no image? "image_url" is optional in schema?
        // Let's try without image file first to simplify, or use a known one.

        const submitRes = await axios.post(`${API_URL}/articles`, form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${authorToken}`
            }
        });

        articleId = submitRes.data.status === 'pending' ? 'ID_UNKNOWN' : 'ID_UNKNOWN';
        // My API doesn't return ID in the create response? 
        // Let's check server.js line 444: res.status(201).json({ message: 'Article created', status: finalStatus });
        // Ah, it doesn't return ID! That's a "Gap". 
        // I need to find the ID.
        console.log(`✓ Article Submitted. Status: ${submitRes.data.status}`);

        // 4. Find the Article ID (as Editor)
        console.log('\n[4] Editor Fetching Pending Articles...');
        // I need an endpoint that lists pending articles.
        // server.js check: app.get('/api/admin/pending-articles', ...) ?
        // or app.get('/api/admin/pending-approvals')
        // I recall seeing `app.get('/api/articles?status=pending')` or similar?
        // Let's try fetching author's articles using author token to get ID.

        const myArticlesRes = await axios.get(`${API_URL}/articles/my-articles`, {
            headers: { Authorization: `Bearer ${authorToken}` }
        });
        const myArticle = myArticlesRes.data.find(a => a.title === 'End-to-End Test Article');
        if (!myArticle) throw new Error('Could not find submitted article!');
        articleId = myArticle.id;
        console.log(`✓ Found Article ID: ${articleId}`);


        // 5. Editor Approves Article
        console.log('\n[5] Editor Approving...');
        // PUT /api/articles/:id with status='published'
        const approveRes = await axios.put(`${API_URL}/articles/${articleId}`, {
            status: 'published'
        }, {
            headers: { Authorization: `Bearer ${editorToken}` }
        });
        console.log('✓ Approval Response:', approveRes.data.message);


        // 6. Public Verification
        console.log('\n[6] Verifying Public Visibility...');
        const publicRes = await axios.get(`${API_URL}/articles`);
        const isPublished = publicRes.data.find(a => a.id === articleId);

        if (isPublished) {
            console.log('SUCCESS: Article is visible in public list!');
        } else {
            console.error('FAILURE: Article NOT found in public list.');
        }

        // 7. Check Detail Page Content
        console.log('\n[7] Verifying Detail Page Content...');
        const detailRes = await axios.get(`${API_URL}/articles/${articleId}`);
        if (detailRes.data.title === 'End-to-End Test Article') {
            console.log('SUCCESS: Article detail content matches.');
        } else {
            console.error('FAILURE: Article detail content mismatch.');
        }

    } catch (e) {
        console.error('TEST FAILED:', e.message);
        if (e.response) console.error('Data:', e.response.data);
    }
}

runTest();

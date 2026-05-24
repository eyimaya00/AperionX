const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

const API_URL = 'http://localhost:3000/api';

async function runTest() {
    const connection = await mysql.createConnection(dbConfig);

    try {
        console.log('--- Setting up Test Data ---');
        // 1. Create Test Editor
        const editorEmail = 'testeditor_' + Date.now() + '@test.com';
        const editorPass = '123456';
        const hashedIds = await bcrypt.hash(editorPass, 10);
        const [editorRes] = await connection.query('INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, ?)', ['Test Editor', editorEmail, hashedIds, 'editor']);
        const editorId = editorRes.insertId;
        console.log('Created Editor:', editorEmail);

        // 2. Create Test Author
        const authorEmail = 'testauthor_' + Date.now() + '@test.com';
        const [authorRes] = await connection.query('INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, ?)', ['Test Author', authorEmail, hashedIds, 'author']);
        const authorId = authorRes.insertId;
        console.log('Created Author:', authorEmail);

        // 3. Create Test Article by Author
        const [artRes] = await connection.query("INSERT INTO articles (title, content, author_id, status, excerpt) VALUES (?, ?, ?, ?, ?)",
            ['Test Article', 'Content', authorId, 'published', 'Excerpt']);
        const articleId = artRes.insertId;
        console.log('Created Article ID:', articleId);

        // --- Execute Tests ---

        // 4. Login as Editor
        console.log('\n--- Login as Editor ---');
        const loginRes = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: editorEmail, password: editorPass })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('Logged in. Token obtained.');
        const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

        // 5. Test Edit (PUT)
        console.log('\n--- Test: Edit Article ---');
        const updateRes = await fetch(`${API_URL}/articles/${articleId}`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ title: 'Edited by Editor', content: 'New Content' })
        });

        if (updateRes.ok) {
            console.log('SUCCESS: Editor updated the article.');
        } else {
            console.error('FAILED: Editor could not update article.', await updateRes.text());
        }

        // Verify Edit in DB
        const [checkEdit] = await connection.query('SELECT title FROM articles WHERE id = ?', [articleId]);
        if (checkEdit.length > 0 && checkEdit[0].title === 'Edited by Editor') {
            console.log('VERIFIED: Database reflects changes.');
        } else {
            console.error('VERIFICATION FAILED: Title mismatch or not found:', checkEdit[0]?.title);
        }

        // 6. Test Delete (DELETE)
        console.log('\n--- Test: Delete Article ---');
        const deleteRes = await fetch(`${API_URL}/articles/permanent/${articleId}`, {
            method: 'DELETE',
            headers: authHeaders
        });

        if (deleteRes.ok) {
            console.log('SUCCESS: Editor deleted the article.');
        } else {
            console.error('FAILED: Editor could not delete article.', await deleteRes.text());
        }

        // Verify Delete in DB
        const [checkDelete] = await connection.query('SELECT id FROM articles WHERE id = ?', [articleId]);
        if (checkDelete.length === 0) {
            console.log('VERIFIED: Article removed from database.');
        } else {
            console.error('VERIFICATION FAILED: Article still exists.');
        }

    } catch (e) {
        console.error('Test Script Error:', e);
    } finally {
        await connection.end();
    }
}

runTest();

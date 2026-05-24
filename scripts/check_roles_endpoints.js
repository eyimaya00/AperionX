const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const API_URL = 'http://localhost:3000/api';

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function run() {
    const conn = await mysql.createConnection(dbConfig);
    const password = await bcrypt.hash('password123', 10);

    // Create Test Users
    const users = [
        { name: 'Test Admin', email: 'test_admin@example.com', role: 'admin' },
        { name: 'Test Editor', email: 'test_editor@example.com', role: 'editor' },
        { name: 'Test Author', email: 'test_author@example.com', role: 'author' }
    ];

    const tokens = {};

    try {
        console.log('--- Setting up Test Users ---');
        for (const u of users) {
            // Cleanup first
            await conn.query('DELETE FROM users WHERE email = ?', [u.email]);
            await conn.query('INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, ?)',
                [u.name, u.email, password, u.role]);

            // Login
            try {
                const res = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: u.email, password: 'password123' })
                });
                const data = await res.json();

                if (res.ok && data.token) {
                    tokens[u.role] = data.token;
                    console.log(`[PASS] Login as ${u.role}`);
                } else {
                    console.error(`[FAIL] Login as ${u.role}:`, data);
                }
            } catch (e) {
                console.error(`[FAIL] Login as ${u.role}:`, e.message);
            }
        }

        console.log('\n--- Verifying Access Permissions ---');

        // 1. Admin Verification: GET /api/admin/users
        if (tokens.admin) {
            try {
                const res = await fetch(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${tokens.admin}` } });
                if (res.ok) console.log('[PASS] Admin can access /api/admin/users');
                else console.error(`[FAIL] Admin cannot access /api/admin/users (Status: ${res.status})`);
            } catch (e) { console.error('[FAIL] Admin network error:', e.message); }
        }

        // 2. Editor Verification
        if (tokens.editor) {
            // Should Access Editor Route
            try {
                const res = await fetch(`${API_URL}/editor/stats`, { headers: { Authorization: `Bearer ${tokens.editor}` } });
                if (res.ok) console.log('[PASS] Editor can access /api/editor/stats');
                else console.error(`[FAIL] Editor cannot access /api/editor/stats (Status: ${res.status})`);
            } catch (e) { console.error('[FAIL] Editor network error:', e.message); }

            // Should NOT Access Admin Route
            try {
                const res = await fetch(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${tokens.editor}` } });
                if (res.status === 403) console.log('[PASS] Editor correctly blocked from /api/admin/users');
                else console.error(`[FAIL] Editor COULD access /api/admin/users (Status: ${res.status})`);
            } catch (e) { console.error(`[FAIL] Unexpected error for Editor accessing admin: ${e.message}`); }
        }

        // 3. Author Verification
        if (tokens.author) {
            // Should Access Author Route
            try {
                const res = await fetch(`${API_URL}/author/stats`, { headers: { Authorization: `Bearer ${tokens.author}` } });
                if (res.ok) console.log('[PASS] Author can access /api/author/stats');
                else console.error(`[FAIL] Author cannot access /api/author/stats (Status: ${res.status})`);
            } catch (e) { console.error('[FAIL] Author network error:', e.message); }

            // Should NOT Access Editor Route
            try {
                const res = await fetch(`${API_URL}/editor/stats`, { headers: { Authorization: `Bearer ${tokens.author}` } });
                if (res.status === 403) console.log('[PASS] Author correctly blocked from /api/editor/stats');
                else console.error(`[FAIL] Author COULD access /api/editor/stats (Status: ${res.status})`);
            } catch (e) { console.error(`[FAIL] Unexpected error for Author accessing editor: ${e.message}`); }
        }

    } catch (err) {
        console.error('Script Error:', err);
    } finally {
        // Cleanup
        console.log('\n--- Cleanup ---');
        for (const u of users) {
            await conn.query('DELETE FROM users WHERE email = ?', [u.email]);
        }
        await conn.end();
    }
}

run();

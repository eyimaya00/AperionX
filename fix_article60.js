// Fix script for Article 60 (Çernobil) - Date & References
// Run on server: node fix_article60.js

const mysql = require('mysql2/promise');
require('dotenv').config();

async function fix() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'aperionx_db'
    });

    try {
        // 1. Check current state
        const [rows] = await pool.query('SELECT id, title, created_at, references_list FROM articles WHERE id = 60');
        if (rows.length === 0) {
            console.log('Article 60 not found!');
            return;
        }

        const article = rows[0];
        console.log('=== CURRENT STATE ===');
        console.log('Title:', article.title);
        console.log('Created At:', article.created_at);
        console.log('References Length:', article.references_list ? article.references_list.length : 0);
        console.log('\n=== CURRENT REFERENCES ===');
        
        if (article.references_list) {
            const lines = article.references_list.split('\n');
            lines.forEach((line, i) => {
                console.log(`Line ${i + 1}: "${line}"`);
            });
        }

        // 2. Fix created_at to NOW
        console.log('\n=== FIXING created_at to NOW() ===');
        await pool.query('UPDATE articles SET created_at = NOW() WHERE id = 60');
        console.log('✅ created_at updated to NOW()');

        // 3. Verify
        const [updated] = await pool.query('SELECT created_at FROM articles WHERE id = 60');
        console.log('New created_at:', updated[0].created_at);

        // 4. Check references and remove duplicates
        if (article.references_list) {
            const refs = article.references_list.split('\n').filter(r => r.trim());
            const uniqueRefs = [];
            const seen = new Set();
            
            refs.forEach(ref => {
                const normalized = ref.trim().toLowerCase();
                if (!seen.has(normalized)) {
                    seen.add(normalized);
                    uniqueRefs.push(ref.trim());
                }
            });

            if (uniqueRefs.length !== refs.length) {
                console.log(`\n=== FIXING REFERENCES ===`);
                console.log(`Original: ${refs.length} entries`);
                console.log(`After dedup: ${uniqueRefs.length} entries`);
                
                const newRefs = uniqueRefs.join('\n');
                await pool.query('UPDATE articles SET references_list = ? WHERE id = 60', [newRefs]);
                console.log('✅ References deduplicated');
                
                console.log('\n=== NEW REFERENCES ===');
                uniqueRefs.forEach((ref, i) => {
                    console.log(`${i + 1}: "${ref}"`);
                });
            } else {
                console.log('\n✅ No duplicate references found');
            }
        }

        console.log('\n=== DONE ===');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}

fix();

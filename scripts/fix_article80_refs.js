// Fix script for Article 80 (HSAN) - References
// Run on server: node fix_article80_refs.js

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
        const [rows] = await pool.query('SELECT id, title, references_list FROM articles WHERE id = 80');
        if (rows.length === 0) {
            console.log('Article 80 not found!');
            return;
        }

        const article = rows[0];
        console.log('Title:', article.title);
        console.log('\n=== CURRENT REFERENCES ===');
        
        if (article.references_list) {
            const lines = article.references_list.split('\n');
            lines.forEach((line, i) => {
                console.log(`Line ${i + 1}: "${line}"`);
            });

            // Fix: Remove leading "). " from first reference line
            let fixedRefs = article.references_list;
            
            // Fix stray "). " at the start of references
            fixedRefs = fixedRefs.replace(/^\)\.\s*/gm, '');
            
            // Also try fixing the pattern where first line starts with ). 
            const fixedLines = fixedRefs.split('\n').map(line => {
                // Remove leading "). " or ") " from beginning of lines
                return line.replace(/^\)\.\s+/, '').replace(/^\)\s+/, '');
            });
            
            const newRefs = fixedLines.join('\n');
            
            if (newRefs !== article.references_list) {
                console.log('\n=== FIXING REFERENCES ===');
                await pool.query('UPDATE articles SET references_list = ? WHERE id = 80', [newRefs]);
                console.log('✅ References fixed');
                
                console.log('\n=== NEW REFERENCES (first 3 lines) ===');
                fixedLines.slice(0, 3).forEach((ref, i) => {
                    console.log(`${i + 1}: "${ref}"`);
                });
            } else {
                console.log('\n✅ No fixes needed');
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

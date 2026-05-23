const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runFixes() {
    console.log('Starting fixes...');
    
    // 1. Fix author.html
    const authorPath = path.join(__dirname, 'author.html');
    let authorHtml = fs.readFileSync(authorPath, 'utf8');
    
    // Check if imageHandler is already added
    if (!authorHtml.includes("expQuillProcedure.getModule('toolbar').addHandler('image'")) {
        const replaceQuillInit = `        function initExpQuill() {
            if (!expQuillProcedure && document.getElementById('exp-editor')) {
                expQuillProcedure = new Quill('#exp-editor', {
                    theme: 'snow',
                    placeholder: 'Deney adımlarını yazın...',
                    modules: { 
                        toolbar: [['bold', 'italic', 'underline'], [{ 'list': 'ordered' }, { 'list': 'bullet' }], ['link', 'image'], ['clean']],
                        imageResize: {}
                    }
                });
                expQuillProcedure.getModule('toolbar').addHandler('image', function() {
                    const input = document.createElement('input');
                    input.setAttribute('type', 'file');
                    input.setAttribute('accept', 'image/*');
                    input.click();
                    input.onchange = async () => {
                        const file = input.files[0];
                        if (file) {
                            const formData = new FormData();
                            formData.append('image', file);
                            const q = this.quill || expQuillProcedure;
                            try {
                                const token = localStorage.getItem('token');
                                const res = await fetch('/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData });
                                if (!res.ok) throw new Error('Yükleme başarısız');
                                const data = await res.json();
                                let range = q.getSelection();
                                if (!range) range = { index: q.getLength() - 1, length: 0 };
                                q.insertEmbed(range.index, 'image', data.url);
                                q.setSelection(range.index + 1);
                            } catch (e) { console.error(e); }
                        }
                    };
                });
            }
            if (!expQuillResults && document.getElementById('exp-results-editor')) {
                expQuillResults = new Quill('#exp-results-editor', {
                    theme: 'snow',
                    placeholder: 'Sonuçları ve gözlemleri yazın...',
                    modules: { 
                        toolbar: [['bold', 'italic', 'underline'], [{ 'list': 'ordered' }, { 'list': 'bullet' }], ['link', 'image'], ['clean']],
                        imageResize: {}
                    }
                });
                expQuillResults.getModule('toolbar').addHandler('image', function() {
                    const input = document.createElement('input');
                    input.setAttribute('type', 'file');
                    input.setAttribute('accept', 'image/*');
                    input.click();
                    input.onchange = async () => {
                        const file = input.files[0];
                        if (file) {
                            const formData = new FormData();
                            formData.append('image', file);
                            const q = this.quill || expQuillResults;
                            try {
                                const token = localStorage.getItem('token');
                                const res = await fetch('/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData });
                                if (!res.ok) throw new Error('Yükleme başarısız');
                                const data = await res.json();
                                let range = q.getSelection();
                                if (!range) range = { index: q.getLength() - 1, length: 0 };
                                q.insertEmbed(range.index, 'image', data.url);
                                q.setSelection(range.index + 1);
                            } catch (e) { console.error(e); }
                        }
                    };
                });
            }
        }`;
        
        const oldQuillInitRegex = /function initExpQuill\(\) \{[\s\S]*?(?=\/\/ Override showSection)/m;
        authorHtml = authorHtml.replace(oldQuillInitRegex, replaceQuillInit + '\n        ');
        fs.writeFileSync(authorPath, authorHtml, 'utf8');
        console.log('Fixed author.html (Quill editors added image upload).');
    }

    // 2. Fix editor_panel.html
    const editorPath = path.join(__dirname, 'editor_panel.html');
    let editorHtml = fs.readFileSync(editorPath, 'utf8');
    if (!editorHtml.includes('<a href="/deney/${exp.slug}"')) {
        editorHtml = editorHtml.replace(
            /actions = `<button onclick="approveExp\(\$\{exp\.id\}\)"(.*?)<\/button>\s*<button onclick="rejectExp\(\$\{exp\.id\}\)"(.*?)<\/button>`;/g,
            `actions = \`<button onclick="approveExp(\\\${exp.id})" $1</button>
                    <button onclick="rejectExp(\\\${exp.id})" $2</button>
                    <a href="/deney/\\\${exp.slug}" target="_blank" style="background:#6366f1; color:white; padding:6px 12px; border-radius:8px; text-decoration:none; display:inline-block; font-size:0.85rem;"><i class="ph ph-eye"></i> İncele</a>\`;`
        );
        fs.writeFileSync(editorPath, editorHtml, 'utf8');
        console.log('Fixed editor_panel.html (Preview button added).');
    }

    // 3. Fix admin.html
    const adminPath = path.join(__dirname, 'admin.html');
    let adminHtml = fs.readFileSync(adminPath, 'utf8');
    if (!adminHtml.includes('<a href="/deney/${exp.slug}" target="_blank" style="background:#6366f1')) {
        adminHtml = adminHtml.replace(
            /actions = `<button onclick="adminApproveExp\(\$\{exp\.id\}\)"(.*?)<\/button>\s*<button onclick="adminRejectExp\(\$\{exp\.id\}\)"(.*?)<\/button>`;/g,
            `actions = \`<button onclick="adminApproveExp(\\\${exp.id})" $1</button>
                    <button onclick="adminRejectExp(\\\${exp.id})" $2</button>
                    <a href="/deney/\\\${exp.slug}" target="_blank" style="background:#6366f1; color:white; padding:6px 12px; border-radius:8px; text-decoration:none; display:inline-block; font-size:0.8rem;" title="İncele"><i class="ph ph-eye"></i></a>\`;`
        );
        fs.writeFileSync(adminPath, adminHtml, 'utf8');
        console.log('Fixed admin.html (Preview button added).');
    }
    
    // 4. Update Database for menu
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'aperionx_db'
        });
        
        const [rows] = await pool.query('SELECT * FROM menus WHERE url = ? OR url = ?', ['/experiments.html', 'experiments.html']);
        if (rows.length === 0) {
            console.log('Deneyler link missing in menus table, inserting...');
            await pool.query('INSERT INTO menus (label, url, `order`) VALUES (?, ?, ?)', ['Deneyler', '/experiments.html', 2]);
            console.log('Inserted Deneyler menu.');
        } else {
            console.log('Deneyler link already exists in menus table.');
        }
        await pool.end();
    } catch (e) {
        console.error('DB Update Error:', e);
    }
    
    console.log('All fixes completed.');
}

runFixes();

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'author.html');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize all line endings to \n for matching
let normalized = content.replace(/\r\n/g, '\n');

// Find the editExperiment function boundaries
const startMarker = '        async function editExperiment(id) {';
const startIdx = normalized.indexOf(startMarker);
if (startIdx === -1) {
    console.log('ERROR: Could not find editExperiment start');
    process.exit(1);
}

// Find the end of the function - it ends with "        }" followed by empty line and deleteExperiment
const afterStart = normalized.indexOf('\n        async function deleteExperiment(id) {', startIdx);
if (afterStart === -1) {
    console.log('ERROR: Could not find deleteExperiment after editExperiment');
    process.exit(1);
}

// The function block to replace is from startIdx to the line before deleteExperiment
// We need to find the "        }\n\n" just before deleteExperiment
const oldBlock = normalized.substring(startIdx, afterStart);
console.log('Found old block, length:', oldBlock.length);
console.log('First 80 chars:', JSON.stringify(oldBlock.substring(0, 80)));

const newBlock = `        async function editExperiment(id) {
            var exp = allMyExperiments.find(function(e) { return e.id === id; });
            if (!exp) return;

            editingExpId = id;
            document.querySelectorAll('.menu-item').forEach(function(m) { m.classList.remove('active'); });
            showSection('new-experiment', document.querySelector('[title="Yeni Deney"]'));

            // Poll until Quill editors are ready before filling form
            function waitForQuillAndFill(attempt) {
                if (attempt > 30) { fillExpForm(exp); return; }
                initExpQuill();
                if (expQuillProcedure && expQuillResults) {
                    fillExpForm(exp);
                } else {
                    setTimeout(function() { waitForQuillAndFill(attempt + 1); }, 100);
                }
            }
            setTimeout(function() { waitForQuillAndFill(0); }, 100);
        }

        function fillExpForm(exp) {
            document.getElementById('exp-title').value = exp.title || '';
            document.getElementById('exp-category').value = exp.category || 'Biyoloji';
            document.getElementById('exp-tags').value = exp.tags || '';
            document.getElementById('exp-excerpt').value = exp.excerpt || '';
            document.getElementById('exp-objective').value = exp.objective || '';
            document.getElementById('exp-materials').value = exp.materials || '';
            document.getElementById('exp-safety').value = exp.safety_notes || '';
            document.getElementById('exp-conclusion').value = exp.conclusion || '';
            document.getElementById('exp-youtube').value = exp.youtube_url || '';
            document.getElementById('exp-references').value = exp.references_list || '';
            if (expQuillProcedure) expQuillProcedure.root.innerHTML = exp.procedure_steps || '';
            if (expQuillResults) expQuillResults.root.innerHTML = exp.results || '';
            if (exp.image_url) {
                var pz = document.getElementById('exp-preview-zone');
                if (pz) pz.innerHTML = '<img src="/' + exp.image_url + '" style="max-height:180px;border-radius:10px;object-fit:contain;">';
            }
            if (exp.pdf_url) {
                var ppz = document.getElementById('exp-pdf-zone');
                if (ppz) ppz.innerHTML = '<i class="ph ph-file-pdf" style="font-size:28px;color:#ef4444;margin-bottom:10px;"></i><p style="margin:0;font-weight:600;color:var(--primary-accent);">Mevcut PDF</p>';
            }
            document.getElementById('exp-form-title').textContent = 'Deney D\u00FCzenle';
            document.getElementById('reset-exp-form-btn').style.display = 'inline-flex';
            if (typeof loadExpAuthorsForSelection === 'function') loadExpAuthorsForSelection(exp.id);
        }
`;

normalized = normalized.replace(oldBlock, newBlock);

// Restore original CRLF line endings
const final = normalized.replace(/\n/g, '\r\n');
fs.writeFileSync(filePath, final, 'utf8');
console.log('SUCCESS: editExperiment replaced with Quill-polling version + fillExpForm helper');

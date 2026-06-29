const fs = require('fs');

const adminHtmlPath = 'views/admin.html';
let content = fs.readFileSync(adminHtmlPath, 'utf8');

const sectionHtml = `
        <!-- === CATEGORY CARDS MANAGEMENT === -->
        <div id="category-cards-management" class="section">
            <div class="header-row">
                <h2 class="page-title">Kategori Kartları Yönetimi</h2>
                <button class="btn btn-primary" onclick="showCategoryCardModal()"><i class="ph ph-plus"></i> Yeni Kart Ekle</button>
            </div>
            <p class="section-subtitle">Ana sayfadaki Keşfet bölümündeki kategori kartlarını buradan yönetebilirsiniz.</p>
            <div class="card">
                <div style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; text-align:left;">
                        <thead>
                            <tr style="border-bottom:2px solid #e2e8f0; color:#64748b;">
                                <th style="padding:12px;">İkon</th>
                                <th style="padding:12px;">Başlık</th>
                                <th style="padding:12px;">Açıklama</th>
                                <th style="padding:12px;">Link</th>
                                <th style="padding:12px; text-align:center;">Sıra</th>
                                <th style="padding:12px; text-align:center;">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody id="category-cards-tbody">
                            <!-- JS ile doldurulacak -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
`;

const modalHtml = `
    <!-- Category Card Modal -->
    <div class="modal-overlay" id="categoryCardModal">
        <div class="modal-box" style="max-width: 520px; padding: 32px;">
            <h3 id="categoryCardModalTitle" style="margin-bottom: 24px; font-size: 1.4rem; color: #1e293b;">Yeni Kart</h3>
            <form id="categoryCardForm" style="display: flex; flex-direction: column; gap: 16px;">
                <input type="hidden" id="category_card_id">
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="margin-bottom: 6px; display: block; font-weight: 600; color: #64748b;">Başlık *</label>
                    <input type="text" id="category_card_title" class="form-control" placeholder="Örn: Makaleler" required>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="margin-bottom: 6px; display: block; font-weight: 600; color: #64748b;">Açıklama *</label>
                    <textarea id="category_card_description" class="form-control" rows="3" placeholder="Kısa açıklama metni" required></textarea>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="margin-bottom: 6px; display: block; font-weight: 600; color: #64748b;">İkon Sınıfı (Class) *</label>
                    <input type="text" id="category_card_icon" class="form-control" placeholder="Örn: ph-fill ph-book-open-text" required>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="margin-bottom: 6px; display: block; font-weight: 600; color: #64748b;">Link URL *</label>
                    <input type="text" id="category_card_link" class="form-control" placeholder="Örn: /articles" required>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="margin-bottom: 6px; display: block; font-weight: 600; color: #64748b;">Sıra</label>
                    <input type="number" id="category_card_order" class="form-control" placeholder="1" min="0">
                </div>
                <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px;">
                    <button type="button" onclick="closeCategoryCardModal()" class="btn" style="background: #f1f5f9; color: #64748b;">İptal</button>
                    <button type="submit" class="btn btn-primary">Kaydet</button>
                </div>
            </form>
        </div>
    </div>
`;

const jsHtml = `
        // === CATEGORY CARDS LOGIC ===
        async function loadCategoryCards() {
            const tbody = document.getElementById('category-cards-tbody');
            if (!tbody) return;
            try {
                const res = await fetch(\`\${API_URL}/categories\`);
                const cards = await res.json();
                if (!cards || cards.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #94a3b8;">Kayıtlı kategori kartı yok.</td></tr>';
                    return;
                }
                tbody.innerHTML = cards.map(c => \`
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 12px; font-size: 1.5rem; color: #6366f1;"><i class="\${c.icon_class}"></i></td>
                        <td style="padding: 12px; font-weight: 600;">\${c.title}</td>
                        <td style="padding: 12px; color: #64748b; font-size: 0.9rem;">\${c.description}</td>
                        <td style="padding: 12px; color: #6366f1;">\${c.link_url}</td>
                        <td style="padding: 12px; text-align: center;">\${c.order_index}</td>
                        <td style="padding: 12px; text-align: center; white-space: nowrap;">
                            <button onclick='editCategoryCard(\${JSON.stringify(c).replace(/'/g, "&#39;")})' class="btn" style="background:#eef2ff; color:#6366f1; padding:6px 12px; font-size:0.85rem; margin-right:4px;" title="Düzenle"><i class="ph ph-pencil-simple"></i></button>
                            <button onclick="deleteCategoryCard(\${c.id})" class="btn" style="background:#fef2f2; color:#ef4444; padding:6px 12px; font-size:0.85rem;" title="Sil"><i class="ph ph-trash"></i></button>
                        </td>
                    </tr>
                \`).join('');
            } catch (e) {
                console.error(e);
            }
        }

        function showCategoryCardModal(editData) {
            document.getElementById('categoryCardModalTitle').textContent = editData ? 'Kartı Düzenle' : 'Yeni Kart';
            document.getElementById('category_card_id').value = editData ? editData.id : '';
            document.getElementById('category_card_title').value = editData ? editData.title : '';
            document.getElementById('category_card_description').value = editData ? editData.description : '';
            document.getElementById('category_card_icon').value = editData ? editData.icon_class : '';
            document.getElementById('category_card_link').value = editData ? editData.link_url : '';
            document.getElementById('category_card_order').value = editData ? editData.order_index : 0;
            document.getElementById('categoryCardModal').classList.add('show');
        }

        function closeCategoryCardModal() {
            document.getElementById('categoryCardModal').classList.remove('show');
            document.getElementById('categoryCardForm').reset();
        }

        function editCategoryCard(data) {
            showCategoryCardModal(data);
        }

        function deleteCategoryCard(id) {
            showConfirmModal('Bu kartı silmek istediğinize emin misiniz?', async () => {
                try {
                    const res = await fetch(\`\${API_URL}/categories/\${id}\`, {
                        method: 'DELETE',
                        headers: { 'Authorization': \`Bearer \${token}\` }
                    });
                    if (res.ok) {
                        showToast('Kart silindi', 'success');
                        loadCategoryCards();
                    } else showToast('Hata', 'error');
                } catch (e) { showToast('Hata', 'error'); }
            });
        }

        document.getElementById('categoryCardForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('category_card_id').value;
            const data = {
                title: document.getElementById('category_card_title').value,
                description: document.getElementById('category_card_description').value,
                icon_class: document.getElementById('category_card_icon').value,
                link_url: document.getElementById('category_card_link').value,
                order_index: document.getElementById('category_card_order').value || 0
            };
            const url = id ? \`\${API_URL}/categories/\${id}\` : \`\${API_URL}/categories\`;
            const method = id ? 'PUT' : 'POST';
            try {
                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    showToast(id ? 'Kart güncellendi' : 'Kart eklendi', 'success');
                    closeCategoryCardModal();
                    loadCategoryCards();
                } else showToast('Hata', 'error');
            } catch (e) { showToast('Hata', 'error'); }
        });
`;

if (!content.includes('id="category-cards-management"')) {
    content = content.replace('<div id="homepage-management"', sectionHtml + '\n        <div id="homepage-management"');
}

if (!content.includes('id="categoryCardModal"')) {
    content = content.replace('<!-- Team Member Modal -->', modalHtml + '\n    <!-- Team Member Modal -->');
}

if (!content.includes('loadCategoryCards() {')) {
    content = content.replace('// === TEAM MEMBERS MANAGEMENT ===', jsHtml + '\n        // === TEAM MEMBERS MANAGEMENT ===');
}

fs.writeFileSync(adminHtmlPath, content, 'utf8');
console.log('Successfully updated admin.html');

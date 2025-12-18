const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'script.js');

try {
    let content = fs.readFileSync(targetPath, 'utf8');

    // Find the end of the valid code
    const validEndMarker = "} catch (e) { console.error('Slider load error:', e); }";
    const markerIndex = content.lastIndexOf(validEndMarker);

    if (markerIndex === -1) {
        console.error('Could not find the valid end marker.');
        process.exit(1);
    }

    // Cut off everything after the marker + closing brace of function
    // The marker is inside `loadArticleSlider`. The function closes with `}` shortly after.
    // Actually, looking at the view:
    // 1582: ... error:', e); }
    // 1583: }
    // So we need to include the `}` for the function `loadArticleSlider`.

    // Let's find the marker, then find the next `}`
    const cutOffPoint = content.indexOf('}', markerIndex + validEndMarker.length) + 1;

    let cleanContent = content.substring(0, cutOffPoint);

    // Append the RESTORED logic
    const restoredCode = `

// --- Article Interactions (Likes & Comments) ---

async function loadLikes(id) {
    try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': \`Bearer \${token}\` } : {};
        const res = await fetch(\`\${API_URL}/articles/\${id}/like\`, { headers });
        const data = await res.json();

        const btn = document.getElementById('like-btn');
        if (!btn) return;

        if (data.liked) {
            btn.classList.add('liked');
            btn.innerHTML = \`<i class="ph-fill ph-heart"></i> Beğendin & Destek Oldun\`;
        } else {
            btn.classList.remove('liked');
            btn.innerHTML = \`<i class="ph ph-heart"></i> Beğen & Destek Ol\`;
        }
    } catch (e) { console.error('Like load error', e); }
}

async function toggleLike() {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Beğenmek için giriş yapmalısınız.', 'error');
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;

    try {
        const res = await fetch(\`\${API_URL}/articles/\${id}/like\`, {
            method: 'POST',
            headers: { 'Authorization': \`Bearer \${token}\` }
        });
        
        if (res.ok) {
            loadLikes(id); // Reload UI
        } else {
            showToast('İşlem başarısız.', 'error');
        }
    } catch (e) { console.error(e); }
}

// --- Comments ---

async function loadComments(id) {
    const list = document.getElementById('comments-list');
    if (!list) return;

    try {
        const res = await fetch(\`\${API_URL}/articles/\${id}/comments\`);
        const comments = await res.json();

        const countEl = document.getElementById('comment-count');
        if (countEl) countEl.innerText = \`(\${comments.length})\`;

        list.innerHTML = '';
        if (comments.length === 0) {
            list.innerHTML = '<p class="no-comments">Henüz yorum yapılmamış. İlk yorumu sen yap!</p>';
            return;
        }

        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

        comments.forEach(com => {
            const isOwner = currentUser && currentUser.id === com.user_id;
            const dateStr = new Date(com.created_at).toLocaleDateString('tr-TR');
            
            const div = document.createElement('div');
            div.className = 'comment-item';
            div.innerHTML = \`
                <div class="comment-avatar">
                    <span>\${com.fullname.charAt(0).toUpperCase()}</span>
                </div>
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">\${escapeHtml(com.fullname)}</span>
                        <span class="comment-date">\${dateStr}</span>
                        \${isOwner ? \`<button class="delete-comment-btn" onclick="deleteComment(\${com.id})"><i class="ph ph-trash"></i></button>\` : ''}
                    </div>
                    <p class="comment-text">\${escapeHtml(com.content)}</p>
                </div>
            \`;
            list.appendChild(div);
        });

    } catch (e) { console.error('Comment load error', e); }
}

async function postComment() {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Yorum yapmak için giriş yapmalısınız.', 'error');
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const input = document.getElementById('comment-input');
    const content = input.value.trim();

    if (!content) return;

    try {
        const res = await fetch(\`\${API_URL}/articles/\${id}/comments\`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': \`Bearer \${token}\`
            },
            body: JSON.stringify({ content })
        });

        if (res.ok) {
            input.value = '';
            showToast('Yorum gönderildi!', 'success');
            loadComments(id);
        } else {
            showToast('Yorum gönderilemedi.', 'error');
        }
    } catch (e) { console.error(e); }
}

async function deleteComment(commentId) {
    if (!confirm('Yorumu silmek istediğinize emin misiniz?')) return;

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(\`\${API_URL}/comments/\${commentId}\`, {
            method: 'DELETE',
            headers: { 'Authorization': \`Bearer \${token}\` }
        });

        if (res.ok) {
            showToast('Yorum silindi.', 'success');
            const params = new URLSearchParams(window.location.search);
            loadComments(params.get('id'));
        } else {
            showToast('Silme başarısız.', 'error');
        }
    } catch (e) { console.error(e); }
}
`;

    // Write back
    fs.writeFileSync(targetPath, cleanContent + restoredCode, 'utf8');
    console.log('Successfully fixed script.js');

} catch (err) {
    console.error('Error fixing script:', err);
    process.exit(1);
}

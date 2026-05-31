const fs = require('fs');

let js = fs.readFileSync('public/script_v105.js', 'utf8');

// 1. Remove loadUserInfo
js = js.replace(/async function loadUserInfo\(\) \{[\s\S]*?function toggleUserDropdown\(\) \{/g, 'function toggleUserDropdown() {');
// Remove the call to loadUserInfo() at the top
js = js.replace(/loadUserInfo\(\);/g, '');

// 2. Rewrite checkAuthStatus
const checkAuthStatusOld = `    if (user && token) {
        authButtons.forEach(container => {
            let titleAttr = 'Profilime Git';
            if (user.role === 'admin') titleAttr = 'Admin Paneli';
            else if (user.role === 'author') titleAttr = 'Yazar Paneli';
            else if (user.role === 'editor') titleAttr = 'Editör Paneli';

            // SIMPLE, DIRECT ONCLICK - NO EVENT LISTENERS
            container.innerHTML = \`
                <button type="button" class="btn btn-login" onclick="window.navigateToDashboard();" title="\${titleAttr}" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <span class="user-name">\${escapeHtml(user.fullname || user.username || 'Üye')}</span>
                    <i class="ph-fill ph-user-circle" style="font-size: 1.2rem;"></i>
                </button>
                <button type="button" class="btn btn-login btn-sm" onclick="window.logout();">Çıkış</button>
            \`;`;

const checkAuthStatusNew = `    if (user && token) {
        authButtons.forEach(container => {
            if (container.classList.contains('mobile-auth')) {
                container.innerHTML = \`
                    <div class="mobile-user-profile">
                        <img src="\${user.avatar || user.avatar_url || 'https://ui-avatars.com/api/?name=' + escapeHtml(user.fullname || user.username || 'U')}" alt="User">
                        <div class="mobile-user-info">
                            <span class="name">\${escapeHtml(user.fullname || user.username)}</span>
                            <span class="role">\${user.role === 'admin' ? 'Yönetici' : (user.role === 'editor' ? 'Editör' : (user.role === 'author' ? 'Yazar' : 'Üye'))}</span>
                        </div>
                    </div>
                    <div class="mobile-user-links">
                        \${user.role === 'admin' ? '<a href="/admin" class="btn btn-outline"><i class="ph-bold ph-shield-check"></i> Admin Paneli</a>' : ''}
                        \${user.role === 'author' || user.role === 'admin' ? '<a href="/author" class="btn btn-outline"><i class="ph-bold ph-pen-nib"></i> Yazar Paneli</a>' : ''}
                        \${user.role === 'editor' ? '<a href="/editor" class="btn btn-outline"><i class="ph-bold ph-pencil"></i> Editör Paneli</a>' : ''}
                        <a href="/profile.html" class="btn btn-outline"><i class="ph-bold ph-user"></i> Profil</a>
                        <button onclick="window.logout()" class="btn btn-primary" style="width:100%">Çıkış Yap</button>
                    </div>
                \`;
            } else {
                container.innerHTML = \`
                    <div class="user-dropdown" style="position:relative;">
                        <button class="user-btn" onclick="toggleUserDropdown(event)">
                            <img src="\${user.avatar || user.avatar_url || 'https://ui-avatars.com/api/?name=' + escapeHtml(user.fullname || user.username || 'U')}" alt="User" class="user-avatar-small">
                            <span>\${escapeHtml((user.fullname || user.username || '').split(' ')[0] || 'Üye')}</span>
                            <i class="ph-bold ph-caret-down"></i>
                        </button>
                        <div class="dropdown-menu" id="user-dropdown-menu">
                            \${user.role === 'admin' ? '<a href="/admin"><i class="ph-bold ph-shield-check"></i> Admin Paneli</a>' : ''}
                            \${(user.role === 'author' || user.role === 'admin') ? '<a href="/author"><i class="ph-bold ph-pen-nib"></i> Yazar Paneli</a>' : ''}
                            \${user.role === 'editor' ? '<a href="/editor"><i class="ph-bold ph-pencil"></i> Editör Paneli</a>' : ''}
                            <a href="/profile.html"><i class="ph-bold ph-user"></i> Profilim</a>
                            <a href="#" onclick="window.logout(); return false;"><i class="ph-bold ph-sign-out"></i> Çıkış Yap</a>
                        </div>
                    </div>
                \`;
            }`;

js = js.replace(checkAuthStatusOld, checkAuthStatusNew);

// Fix toggleUserDropdown to stop propagation so it doesn't immediately close if document listener exists, 
// and add document click listener to close it if clicked outside.
const toggleOld = `function toggleUserDropdown() {
    const menu = document.getElementById('user-dropdown-menu');
    if (menu) menu.classList.toggle('active');
}`;

const toggleNew = `function toggleUserDropdown(event) {
    if(event) event.stopPropagation();
    document.querySelectorAll('.dropdown-menu').forEach(m => {
        if(m.id !== 'user-dropdown-menu') m.classList.remove('active');
    });
    const menu = document.getElementById('user-dropdown-menu');
    if (menu) menu.classList.toggle('active');
}
// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const menu = document.getElementById('user-dropdown-menu');
    const userBtn = document.querySelector('.user-btn');
    if (menu && menu.classList.contains('active')) {
        if (!menu.contains(event.target) && (!userBtn || !userBtn.contains(event.target))) {
            menu.classList.remove('active');
        }
    }
});
`;

js = js.replace(toggleOld, toggleNew);

fs.writeFileSync('public/script_v105.js', js);
console.log('Script updated successfully!');

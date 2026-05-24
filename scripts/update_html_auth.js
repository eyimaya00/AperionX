const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    'index.html',
    'about.html',
    'articles.html',
    'article-detail.html',
    'author-profile.html',
    'profile.html',
    'temp_page.html',
    'vsepr.html'
];

const googleScriptTag = '<script src="https://accounts.google.com/gsi/client" async defer></script>';

const newLoginSnippet = `<div class="remember-me-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <label class="remember-me-label" style="display: flex; align-items: center; cursor: pointer; font-size: 0.9rem; color: var(--text-color);">
                        <input type="checkbox" id="login-remember" class="remember-checkbox" style="margin-right: 8px;">
                        <span>Beni Hatırla</span>
                    </label>
                    <a href="#" onclick="switchModal('loginModal', 'forgotPasswordModal')" class="forgot-password-link" style="color: var(--primary-color); text-decoration: none; font-size: 0.9rem;">Şifremi Unuttum?</a>
                </div>
                <button type="submit" class="btn-primary">Giriş Yap</button>
            </form>
            <div class="social-login-divider" style="display: flex; align-items: center; text-align: center; margin: 20px 0;">
                <span style="flex: 1; border-bottom: 1px solid rgba(255,255,255,0.1);"></span>
                <span style="padding: 0 10px; color: #888; font-size: 0.9rem;">veya</span>
                <span style="flex: 1; border-bottom: 1px solid rgba(255,255,255,0.1);"></span>
            </div>
            <div class="social-login-buttons" style="display: flex; justify-content: center; margin-bottom: 20px; min-height: 40px;">
                <div id="google-login-btn"></div>
            </div>
            <div class="modal-footer">
                <p>Hesabınız yok mu? <a href="#" onclick="switchModal('loginModal', 'signupModal')">Üye Ol</a></p>
            </div>`;

filesToUpdate.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
        console.log('File not found: ' + file);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Add Google Script if not exists
    if (!content.includes(googleScriptTag)) {
        content = content.replace('</head>', '    ' + googleScriptTag + '\n</head>');
        changed = true;
    }

    const searchRegex = /<div style="text-align: right; margin-bottom: 10px;">\s*<a href="#" onclick="switchModal\('loginModal', 'forgotPasswordModal'\)"\s*class="forgot-password-link">Şifremi Unuttum\?<\/a>\s*<\/div>\s*<button type="submit" class="btn-primary">Giriş Yap<\/button>\s*<\/form>\s*<div class="modal-footer">\s*<p>Hesabınız yok mu\? <a href="#" onclick="switchModal\('loginModal', 'signupModal'\)">Üye Ol<\/a><\/p>\s*<\/div>/g;
    
    if (searchRegex.test(content)) {
        content = content.replace(searchRegex, newLoginSnippet);
        changed = true;
    } else {
        console.log('Could not find login snippet in ' + file);
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated ' + file);
    }
});

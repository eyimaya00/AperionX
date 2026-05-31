const fs = require('fs');
const path = require('path');
const viewsDir = path.join(__dirname, 'views');
const files = fs.readdirSync(viewsDir).filter(f => f.endsWith('.html'));

const oldRegex = /<div class="logo-icon">\s*<i class="ph-fill ph-planet"><\/i>\s*<\/div>\s*<span class="logo-text">AperionX<\/span>/g;
const newHtml = '<img src="/uploads/logo.png" alt="AperionX Logo" style="height: 38px; width: auto; object-fit: contain;">';

let updated = 0;
for (const file of files) {
    const filePath = path.join(viewsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    if (oldRegex.test(content)) {
        content = content.replace(oldRegex, newHtml);
        fs.writeFileSync(filePath, content);
        console.log('Updated ' + file);
        updated++;
    }
}
console.log('Total files updated: ' + updated);

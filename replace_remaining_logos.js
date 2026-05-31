const fs = require('fs');
const path = require('path');
const viewsDir = path.join(__dirname, 'views');
const files = fs.readdirSync(viewsDir).filter(f => f.endsWith('.html'));

// This script will find any remaining logo-icon containers and replace them with the image logo.
const oldRegex1 = /<div id="logo-img-container"[^>]*>\s*<i class="ph-fill ph-planet"[^>]*><\/i>\s*<\/div>/g;
const oldRegex2 = /<div class="logo-icon">\s*<i class="ph-fill ph-planet"><\/i>\s*<\/div>\s*<span class="logo-text">AperionX<\/span>/g;
const oldRegex3 = /<i class="ph-fill ph-planet logo-icon"><\/i>/g;

const newHtml1 = '<img src="/uploads/logo.png" alt="AperionX Logo" style="height: 38px; width: auto; object-fit: contain;">';

let updated = 0;
for (const file of files) {
    const filePath = path.join(viewsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    if (oldRegex1.test(content)) {
        content = content.replace(oldRegex1, newHtml1);
        changed = true;
    }
    if (oldRegex2.test(content)) {
        content = content.replace(oldRegex2, newHtml1);
        changed = true;
    }
    if (oldRegex3.test(content)) {
        content = content.replace(oldRegex3, newHtml1);
        changed = true;
    }
    
    // Fix the extra div bug in global-loader in index.html and any other file
    const loaderBugRegex = /<div id="global-loader">([\s\S]*?)<div class="loader-logo-container">([\s\S]*?)<\/div>\s*<!-- Dynamic Image \(Hidden until loaded\) -->\s*<img id="loader-logo-img" src="" alt="Site Logo" style="display: none; max-width: 150px; height: auto;">\s*<\/div>\s*<\/div>\s*<\/div>/g;
    
    if (loaderBugRegex.test(content)) {
        content = content.replace(loaderBugRegex, '<div id="global-loader">$1<div class="loader-logo-container">$2</div>\n                <!-- Dynamic Image (Hidden until loaded) -->\n                <img id="loader-logo-img" src="" alt="Site Logo" style="display: none; max-width: 150px; height: auto;">\n            </div>\n        </div>');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, content);
        console.log('Updated ' + file);
        updated++;
    }
}
console.log('Total files updated: ' + updated);

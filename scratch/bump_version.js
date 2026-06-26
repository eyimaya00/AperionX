const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, '../views');

const files = fs.readdirSync(viewsDir);

files.forEach(file => {
    if (!file.endsWith('.html')) return;
    
    const filePath = path.join(viewsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Replace style.css?v=242
    if (content.includes('/style.css?v=242')) {
        content = content.replaceAll('/style.css?v=242', '/style.css?v=243');
        modified = true;
    }
    
    // Replace script_v105.js?v=242
    if (content.includes('/script_v105.js?v=242')) {
        content = content.replaceAll('/script_v105.js?v=242', '/script_v105.js?v=243');
        modified = true;
    }
    
    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Bumped version in: ${file}`);
    }
});

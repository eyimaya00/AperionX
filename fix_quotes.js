const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.html') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;

            // Fix "/something'
            if (content.match(/"\/[a-zA-Z0-9_/?=-]+'/g)) {
                content = content.replace(/"(\/[a-zA-Z0-9_/?=-]+)'/g, "'$1'");
                changed = true;
            }
            
            // Fix '/something"
            if (content.match(/'\/[a-zA-Z0-9_/?=-]+"/g)) {
                content = content.replace(/'(\/[a-zA-Z0-9_/?=-]+)"/g, '"$1"');
                changed = true;
            }

            if (changed) {
                fs.writeFileSync(fullPath, content);
                console.log('Fixed quotes in', fullPath);
            }
        }
    }
}

processDir('views');
processDir('public');

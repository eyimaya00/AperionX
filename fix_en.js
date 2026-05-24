const fs = require('fs');
const path = require('path');
const viewsDir = 'views';
fs.readdirSync(viewsDir).filter(f => f.endsWith('.html')).forEach(file => {
    const p = path.join(viewsDir, file);
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(/href="https:\/\/aperionx\.com\/en\/([a-zA-Z0-9_-]+)\.html/g, 'href="https://aperionx.com/en/$1');
    c = c.replace(/href="\/([a-zA-Z0-9_-]+)\.html"/g, 'href="/$1"');
    c = c.replace(/href="([a-zA-Z0-9_-]+)\.html"/g, 'href="/$1"');
    fs.writeFileSync(p, c);
});
console.log('Fixed /en/ links and remaining .html');

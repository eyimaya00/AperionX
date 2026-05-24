const fs = require('fs');
const path = require('path');

const viewsDir = 'views';
const htmlFiles = fs.readdirSync(viewsDir).filter(f => f.endsWith('.html'));

htmlFiles.forEach(file => {
    const filePath = path.join(viewsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace absolute hrefs
    content = content.replace(/href="https:\/\/aperionx\.com\/([a-zA-Z0-9_-]+)\.html/g, 'href="https://aperionx.com/$1');
    content = content.replace(/href="https:\/\/www\.aperionx\.com\/([a-zA-Z0-9_-]+)\.html/g, 'href="https://www.aperionx.com/$1');
    
    // Replace absolute contents (og:url)
    content = content.replace(/content="https:\/\/aperionx\.com\/([a-zA-Z0-9_-]+)\.html/g, 'content="https://aperionx.com/$1');
    content = content.replace(/content="https:\/\/www\.aperionx\.com\/([a-zA-Z0-9_-]+)\.html/g, 'content="https://www.aperionx.com/$1');
    
    // Replace JSON-LD URLs
    content = content.replace(/"url":\s*"https:\/\/aperionx\.com\/([a-zA-Z0-9_-]+)\.html/g, '"url": "https://aperionx.com/$1');
    content = content.replace(/"item":\s*"https:\/\/aperionx\.com\/([a-zA-Z0-9_-]+)\.html/g, '"item": "https://aperionx.com/$1');
    
    // Replace relative hrefs that start with /
    content = content.replace(/href="\/([a-zA-Z0-9_-]+)\.html/g, 'href="/$1');

    // Replace window.location.href in inline scripts
    content = content.replace(/window\.location\.href\s*=\s*['"]([a-zA-Z0-9_-]+)\.html/g, 'window.location.href = "/$1');
    content = content.replace(/window\.location\.href\s*=\s*['"]\/([a-zA-Z0-9_-]+)\.html/g, 'window.location.href = "/$1');
    
    fs.writeFileSync(filePath, content);
});

// Also check public/script.js and public/script_v105.js
const publicDir = 'public';
const jsFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.js'));

jsFiles.forEach(file => {
    const filePath = path.join(publicDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    content = content.replace(/window\.location\.href\s*=\s*['"]([a-zA-Z0-9_-]+)\.html/g, 'window.location.href = "/$1');
    content = content.replace(/window\.location\.href\s*=\s*['"]\/([a-zA-Z0-9_-]+)\.html/g, 'window.location.href = "/$1');
    
    fs.writeFileSync(filePath, content);
});

console.log('Deep clean completed.');

const fs = require('fs');
const html = fs.readFileSync('author.html', 'utf8');
const ids = html.match(/id=["']([^"']+)["']/g);
const idMap = {};
for (const match of ids) {
    const id = match.replace(/id=["']|["']/g, '');
    idMap[id] = (idMap[id] || 0) + 1;
}
const duplicates = Object.keys(idMap).filter(id => idMap[id] > 1 && id.startsWith('exp-'));
console.log('Duplicates:', duplicates);

const fs = require('fs');
const acorn = require('acorn');

const code = fs.readFileSync('script.js', 'utf8');
try {
    acorn.parse(code, { ecmaVersion: 2020 });
    console.log('Syntax OK');
} catch (e) {
    console.error('Syntax Error:', e.message, 'at line', e.loc.line);
}

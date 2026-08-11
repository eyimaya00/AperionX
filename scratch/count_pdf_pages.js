const fs = require('fs');
const path = require('path');

const buf = fs.readFileSync(path.join(__dirname, 'test_output.pdf'));
const str = buf.toString('utf-8');
const pageMatches = str.match(/\/Type\s*\/Page\b/g);
console.log('PDF Page Count (by /Type /Page):', pageMatches ? pageMatches.length : 'unknown');

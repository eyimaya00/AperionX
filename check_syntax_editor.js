const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'editor_panel.html');
const content = fs.readFileSync(filePath, 'utf8');

// Simple check for unclosed divs (basic heuristic)
const divOpen = (content.match(/<div/g) || []).length;
const divClose = (content.match(/<\/div>/g) || []).length;

console.log(`<div> tags: Open=${divOpen}, Close=${divClose}`);
if (divOpen !== divClose) {
    console.error('MISMATCH in <div> tags! Potential layout break.');
}

// Check for unclosed script strings or braces (basic)
const scriptContent = content.substring(content.indexOf('<script>') + 8, content.lastIndexOf('</script>'));
if (scriptContent) {
    try {
        new Function(scriptContent);
        console.log('JS Syntax seems OK (compiled via new Function).');
    } catch (e) {
        console.error('JS Syntax Error:', e.message);
    }
}

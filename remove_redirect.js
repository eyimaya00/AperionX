const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');
const targetStr = `app.get('/experiments.html', (req, res) => {\n    res.redirect(301, '/articles.html');\n});`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, '// Redirect removed so views/experiments.html can be served');
    fs.writeFileSync('server.js', content);
    console.log('Redirect removed successfully.');
} else {
    console.log('Target string not found.');
}

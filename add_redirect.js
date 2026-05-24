const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

const redirectMiddleware = `
// 301 Redirect for .html extensions
app.use((req, res, next) => {
    if (req.path.endsWith('.html')) {
        const newPath = req.path.slice(0, -5);
        const query = req.url.slice(req.path.length);
        return res.redirect(301, newPath + query);
    }
    next();
});

// === MAGIC LINK ROUTE ===`;

serverJs = serverJs.replace('// === MAGIC LINK ROUTE ===', redirectMiddleware);

fs.writeFileSync('server.js', serverJs);
console.log('Redirect middleware added.');

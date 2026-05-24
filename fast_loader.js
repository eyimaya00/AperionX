const fs = require('fs');

// 1. Update style.css
let css = fs.readFileSync('style.css', 'utf8');

css = css.replace(/transition: opacity 0\.6s ease, visibility 0\.6s ease;/g, 'transition: opacity 0.2s ease, visibility 0.2s ease;');

css = css.replace(/#loader-logo-img \{[\s\S]*?pulse-glow[\s\S]*?\}/, `#loader-logo-img {
    animation: grow-entrance 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    filter: drop-shadow(0 0 15px rgba(99, 102, 241, 0.3));
    transform: scale(0);
}

@keyframes grow-entrance {
    0% { transform: scale(0); opacity: 0; filter: drop-shadow(0 0 0px rgba(99, 102, 241, 0)); }
    100% { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 20px rgba(99, 102, 241, 0.4)); }
}`);

fs.writeFileSync('style.css', css);

// 2. Update script.js & script_v105.js
const scripts = ['script.js', 'script_v105.js'];
scripts.forEach(s => {
    if (fs.existsSync(s)) {
        let js = fs.readFileSync(s, 'utf8');
        js = js.replace(/setTimeout\(\(\) => \{\s*loader\.style\.display = 'none';\s*\}, 500\);/g, `setTimeout(() => {
            loader.style.display = 'none';
        }, 200);`);
        fs.writeFileSync(s, js);
        console.log('Updated', s);
    }
});

// 3. Bump version in HTML
const htmls = fs.readdirSync('.').filter(f => f.endsWith('.html'));
htmls.forEach(h => {
    let html = fs.readFileSync(h, 'utf8');
    html = html.replace(/style\.css\?v=213/g, 'style.css?v=214');
    html = html.replace(/script_v105\.js\?v=213/g, 'script_v105.js?v=214');
    fs.writeFileSync(h, html);
});
console.log('Done!');

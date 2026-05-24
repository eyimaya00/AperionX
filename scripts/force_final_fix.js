const fs = require('fs');
const path = require('path');

// 1. Update index.html
const htmlPath = path.join(__dirname, 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

if (htmlContent.includes('script.js') && !htmlContent.includes('script_v105.js')) {
    htmlContent = htmlContent.replace('src="script.js"', 'src="script_v105.js"');
    // Also handle possible cache bust params like script.js?v=7.0
    htmlContent = htmlContent.replace(/src="script\.js\?v=[^"]*"/g, 'src="script_v105.js"');
    htmlContent = htmlContent.replace(/src="\/script\.js\?v=[^"]*"/g, 'src="/script_v105.js"');

    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log("Updated index.html to use script_v105.js");
} else {
    console.log("index.html already updated or script.js not found.");
}

// 2. Update style.css
const cssPath = path.join(__dirname, 'style.css');
let cssContent = fs.readFileSync(cssPath, 'utf8');

// Replace standard mobile breakpoint
if (cssContent.includes('max-width: 768px')) {
    // Global replace for robust Tablet support
    cssContent = cssContent.replace(/max-width: 768px/g, 'max-width: 1024px');
    fs.writeFileSync(cssPath, cssContent, 'utf8');
    console.log("Updated style.css breakpoints to 1024px.");
} else {
    console.log("style.css already updated or 768px not found.");
}

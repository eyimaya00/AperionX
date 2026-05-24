const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'style.css');
let content = fs.readFileSync(cssPath, 'utf8');

// We need to find the media query that hides nav-menu and shows mobile-btn
// It usually looks like @media (max-width: 768px) { ... .mobile-menu-btn { display: block; } ... }

// Let's brute force replace ALL "max-width: 768px" with "max-width: 1024px" 
// This is aggressive but ensures tablet coverage for ALL mobile styles (grid, menu, etc.)
// which is usually what we want for "Tablet Header Issue".

// To be safer, we can try to target the specific one if we knew the index.
// But given the overlap compliant, using the mobile layout on tablet is the standard fix.

const newContent = content.replace(/@media \(max-width: 768px\)/g, '@media (max-width: 1024px)');

if (content !== newContent) {
    fs.writeFileSync(cssPath, newContent, 'utf8');
    console.log("Updated breakpoints to 1024px.");
} else {
    console.log("No 768px breakpoints found? Checking file content...");
    // Maybe spaces are different?
    const newContent2 = content.replace(/@media \(max-width: 768px\)/g, '@media (max-width: 1024px)');
    // Regex handles spaces better
    const regex = /@media\s*\(\s*max-width\s*:\s*768px\s*\)/g;
    const newContent3 = content.replace(regex, '@media (max-width: 1024px)');
    if (content !== newContent3) {
        fs.writeFileSync(cssPath, newContent3, 'utf8');
        console.log("Updated breakpoints via regex.");
    } else {
        console.log("Still no match.");
    }
}

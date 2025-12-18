const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'script.js');
let content = fs.readFileSync(filePath, 'utf8');

// Identify the start of the block
const startMarker = "const heroTitle = document.getElementById('hero-title') || document.getElementById('articles-hero-title');";
const endMarker = "const heroDesc = document.getElementById('hero-description') || document.getElementById('articles-hero-description');";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find markers');
    process.exit(1);
}

// Locate the if(heroTitle) block start
const ifBlockStart = content.indexOf('if (heroTitle) {', startIndex);
if (ifBlockStart === -1 || ifBlockStart > endIndex) {
    console.error('Could not find if(heroTitle) block');
    process.exit(1);
}

// Locate the closing brace of the if(heroTitle) block. 
// It should be before the `if (descToUse)` check which is near endMarker.
// Actually, looking at the code:
// if (heroTitle) { ... }
// 
// if (descToUse) { ... }
// 
// So we want to replace everything from `if (heroTitle) {` up to the closing brace before `if (descToUse)`.

// Let's find `if (descToUse)` to ensure we stop before it.
const nextIfIndex = content.indexOf('if (descToUse) {', ifBlockStart);
if (nextIfIndex === -1) {
    console.error('Could not find next if block');
    process.exit(1);
}

// The block to replace is from ifBlockStart to just before nextIfIndex, likely containing the closing brace and some whitespace.
// To be safe, let's just replace the specific content we know is inside.

const newContent = `            if (heroTitle) {
                // Format title based on page context (ID check)
                if (heroTitle.id === 'articles-hero-title') {
                     // ARTICLES PAGE: Gradient Text, no pipe splitting (clean it)
                    if (titleToUse.includes('|')) {
                         const cleanTitle = titleToUse.replace('|', ' ');
                         heroTitle.innerHTML = cleanTitle;
                    } else {
                        heroTitle.innerHTML = titleToUse;
                    }
                    // Apply gradient class
                    heroTitle.classList.add('gradient-text');
                    heroTitle.style.color = ''; // Reset any inline color
                } else {
                    // HOME / ABOUT PAGE: Original Logic (White | Accent)
                    // Ensure no gradient class
                    heroTitle.classList.remove('gradient-text');
                    
                    if (titleToUse.includes('|')) {
                        const parts = titleToUse.split('|');
                        heroTitle.innerHTML = \`<span style="color: #ffffff;">\${parts[0]}</span> <span style="color: var(--primary-accent);">\${parts[1]}</span>\`;
                    } else {
                        // Default fallback if no pipe
                        heroTitle.innerHTML = titleToUse;
                        heroTitle.style.color = ''; // Let CSS handle it or default whitelist
                    }
                }
            }

            `;

// Validating the substring to replace
// The original code has:
// if (heroTitle) {
// ...
// }
//
// if (descToUse)

// We will find the closing brace of `if(heroTitle)` by traversing matching braces? 
// Or simpler: Find the substring that matches the *old* logic start
// "if (titleToUse.includes('|')) {" 
// This is inside the block.

// Let's replace the entire `if (heroTitle) { ... }` block.
// We can find the closing brace by counting braces or just assuming indentation?
// Risky.

// Alternative: We know exactly what the old content looks like from view_file (assuming it's accurate).
// Let's construct a regex that matches the start and end of the block?

// Let's use the known unique lines to define the range.
// Start: `if (heroTitle) {`
// End: `if (descToUse) {`
// We replace everything between Start and End with the new content + whitespace.

const sectionToReplace = content.substring(ifBlockStart, nextIfIndex);
console.log("Original Section Length:", sectionToReplace.length);

// We replace `sectionToReplace` with `newContent`.
const updatedFileContent = content.substring(0, ifBlockStart) + newContent + content.substring(nextIfIndex);

fs.writeFileSync(filePath, updatedFileContent, 'utf8');
console.log('Successfully updated script.js');

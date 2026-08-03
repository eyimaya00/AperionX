const fs = require('fs');
const path = 'public/style.css';
let css = fs.readFileSync(path, 'utf8');

// Normalize line endings for matching
const normalized = css.replace(/\r\n/g, '\n');

const oldBlock = `/* Specific Override for About Page Slider */\n#about-hero-slider {\n    height: 40vh !important;\n    min-height: 350px !important;\n    /* Increased min-height for balance */\n}`;

const newBlock = `/* Specific Override for About Page Slider */\n#about-hero-slider {\n    height: 40vh !important;\n    min-height: 350px !important;\n    display: flex !important;\n    align-items: center !important;\n    justify-content: center !important;\n}\n\n#about-hero-slider .hero-content {\n    position: relative !important;\n    top: auto !important;\n    bottom: auto !important;\n    left: auto !important;\n    right: auto !important;\n    transform: none !important;\n    margin: 0 auto !important;\n    display: flex !important;\n    flex-direction: column !important;\n    align-items: center !important;\n    justify-content: center !important;\n    text-align: center !important;\n    width: 100% !important;\n    height: 100% !important;\n    padding: 0 20px !important;\n}`;

if (normalized.includes(oldBlock)) {
    const result = normalized.replace(oldBlock, newBlock);
    // Convert back to CRLF
    fs.writeFileSync(path, result.replace(/\n/g, '\r\n'), 'utf8');
    console.log('SUCCESS: Replaced about-hero-slider block');
} else {
    console.log('ERROR: Old block not found');
    // Debug: show what's around line 4542
    const lines = css.split(/\r?\n/);
    for (let i = 4539; i < 4548 && i < lines.length; i++) {
        console.log(`Line ${i+1}: [${JSON.stringify(lines[i])}]`);
    }
}

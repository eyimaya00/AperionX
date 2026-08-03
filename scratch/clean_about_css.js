const fs = require('fs');
const path = 'public/style.css';
let css = fs.readFileSync(path, 'utf8');

const normalized = css.replace(/\r\n/g, '\n');

const blockToRemove = `/* Specific Override for About Page Slider */\n#about-hero-slider {\n    height: 40vh !important;\n    min-height: 350px !important;\n    display: flex !important;\n    align-items: center !important;\n    justify-content: center !important;\n}\n\n#about-hero-slider .hero-content {\n    position: relative !important;\n    top: auto !important;\n    bottom: auto !important;\n    left: auto !important;\n    right: auto !important;\n    transform: none !important;\n    margin: 0 auto !important;\n    display: flex !important;\n    flex-direction: column !important;\n    align-items: center !important;\n    justify-content: center !important;\n    text-align: center !important;\n    width: 100% !important;\n    height: 100% !important;\n    padding: 0 20px !important;\n}`;

if (normalized.includes(blockToRemove)) {
    const result = normalized.replace(blockToRemove, '');
    fs.writeFileSync(path, result.replace(/\n/g, '\r\n'), 'utf8');
    console.log('SUCCESS: Removed old #about-hero-slider override');
} else {
    console.log('Block not found');
}

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'article-detail.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. New CSS (Theme Colors + Will Change)
const newCSS = `        .progress-bar {
            height: 100%;
            /* Theme Colors: Restored */
            background: linear-gradient(90deg, var(--primary-color), #a855f7);
            width: 0%;
            /* Optimized for performance */
            will-change: width;
            box-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
        }`;

// 2. New JS (Debounced Observer + Robust Init)
const newJS = `    <script>
        // Progress Bar Logic (Optimized & Themed)
        document.addEventListener('DOMContentLoaded', () => {
            const progressBar = document.getElementById('reading-progress');
            let articleElement = null;
            let ticking = false;

            function updateProgress() {
                if (!progressBar) return;
                
                // 1. Locate Article
                if (!articleElement) articleElement = document.querySelector('.unified-article-card');
                
                // 2. Check Visibility
                if (!articleElement || articleElement.offsetParent === null) {
                    ticking = false;
                    return;
                }

                const scrollTop = window.scrollY || document.documentElement.scrollTop;
                const windowHeight = window.innerHeight;
                const rect = articleElement.getBoundingClientRect();
                
                const elementTop = rect.top + scrollTop;
                const elementHeight = articleElement.offsetHeight;

                // 3. Safety Check
                if (elementHeight === 0) { ticking = false; return; }

                const startPoint = elementTop;
                const endPoint = elementTop + elementHeight - windowHeight;

                let pct = 0;
                if (endPoint > startPoint) {
                    pct = ((scrollTop - startPoint) / (endPoint - startPoint)) * 100;
                }
                
                pct = Math.max(0, Math.min(100, pct));
                progressBar.style.width = pct + "%";
                
                ticking = false;
            }

            function onScroll() {
                if (!ticking) {
                    window.requestAnimationFrame(updateProgress);
                    ticking = true;
                }
            }

            // Debounce for Observer to prevent Freezing/Jank
            let observerTimeout;
            const observer = new MutationObserver(() => {
                if (observerTimeout) clearTimeout(observerTimeout);
                observerTimeout = setTimeout(onScroll, 100); // Wait 100ms before updating on DOM change
            });
            
            const wrapper = document.getElementById('article-wrapper') || document.body;
            observer.observe(wrapper, { attributes: true, childList: true, subtree: true });

            window.addEventListener('scroll', onScroll, { passive: true });
            window.addEventListener('resize', onScroll);
            
            // Initialization Check
            const initLoop = setInterval(() => {
                const el = document.querySelector('.unified-article-card');
                if (el && el.offsetHeight > 0) {
                    updateProgress();
                }
            }, 500);
            
            setTimeout(() => clearInterval(initLoop), 5000);
        });
    </script>`;

// Regex Replacements
// Replace .progress-bar CSS block
const cssRegex = /\.progress-bar\s*\{[\s\S]*?\}/;
if (cssRegex.test(content)) {
    content = content.replace(cssRegex, newCSS);
    console.log("Updated CSS block.");
} else {
    console.warn("CSS block not found via Regex.");
}

// Replace the <script> block
const jsRegex = /<script>\s*\/\/\s*Progress Bar Logic[\s\S]*?<\/script>/;
if (jsRegex.test(content)) {
    content = content.replace(jsRegex, newJS);
    console.log("Updated JS block.");
} else {
    console.warn("JS block not found via Regex.");
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("File saved.");

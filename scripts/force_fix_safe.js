const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'article-detail.html');
let content = fs.readFileSync(filePath, 'utf8');

// New JS: SAFE MODE (try...finally)
const newJS = `    <script>
        // Progress Bar Logic (Safe Mode & No Deadlock)
        document.addEventListener('DOMContentLoaded', () => {
            const progressBar = document.getElementById('reading-progress');
            let articleElement = null;
            let ticking = false;

            function updateProgress() {
                // Wrap in try-finally to ENSURE ticking is reset no matter what
                try {
                    // 1. Locate Article
                    if (!progressBar) return;
                    if (!articleElement) articleElement = document.querySelector('.unified-article-card');
                    
                    // 2. Check Visibility / Existence
                    if (!articleElement || articleElement.offsetParent === null) {
                        return; // Finally block will reset ticking
                    }

                    const scrollTop = window.scrollY || document.documentElement.scrollTop;
                    const windowHeight = window.innerHeight;
                    const rect = articleElement.getBoundingClientRect();
                    
                    const elementTop = rect.top + scrollTop;
                    const elementHeight = articleElement.offsetHeight;

                    // 3. Safety Check
                    if (elementHeight === 0) return;

                    const startPoint = elementTop;
                    const endPoint = elementTop + elementHeight - windowHeight;

                    let pct = 0;
                    if (endPoint > startPoint) {
                        pct = ((scrollTop - startPoint) / (endPoint - startPoint)) * 100;
                    }
                    
                    pct = Math.max(0, Math.min(100, pct));
                    progressBar.style.width = pct + "%";
                } catch (e) {
                    console.error("Progress Bar Error:", e);
                } finally {
                    // CRITICAL: Always release the lock
                    ticking = false;
                }
            }

            function onScroll() {
                if (!ticking) {
                    window.requestAnimationFrame(updateProgress);
                    ticking = true;
                }
            }

            // Standard Observer (No Debounce needed with RAF)
            // This ensures instant reaction to layout shifts
            const observer = new MutationObserver(() => {
                onScroll();
            });
            
            const wrapper = document.getElementById('article-wrapper') || document.body;
            observer.observe(wrapper, { attributes: true, childList: true, subtree: true });

            window.addEventListener('scroll', onScroll, { passive: true });
            window.addEventListener('resize', onScroll);
            
            // Initialization Check to wake it up if loaded late
            const initLoop = setInterval(() => {
                const el = document.querySelector('.unified-article-card');
                if (el && el.offsetHeight > 0) {
                    updateProgress();
                }
            }, 500);
            
            setTimeout(() => clearInterval(initLoop), 5000);
        });
    </script>`;

// Regex to replace the script block
const jsRegex = /<script>\s*\/\/\s*Progress Bar Logic[\s\S]*?<\/script>/;
if (jsRegex.test(content)) {
    content = content.replace(jsRegex, newJS);
    console.log("Updated JS block with Safe Mode logic.");
    fs.writeFileSync(filePath, content, 'utf8');
} else {
    console.error("JS block not found via Regex!");
    process.exit(1);
}

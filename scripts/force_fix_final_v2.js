const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'article-detail.html');
let content = fs.readFileSync(filePath, 'utf8');

// New JS: ZOMBIE CHECK (isConnected)
const newJS = `    <script>
        // Progress Bar Logic (Zombie-Proof & Safe)
        document.addEventListener('DOMContentLoaded', () => {
            const progressBar = document.getElementById('reading-progress');
            let articleElement = null;
            let ticking = false;

            function updateProgress() {
                try {
                    if (!progressBar) return;

                    // 1. Zombie Check: Is the cached element still in the DOM?
                    if (articleElement && !articleElement.isConnected) {
                        articleElement = null; // It died, release it.
                    }

                    // 2. Locate / Re-locate
                    if (!articleElement) {
                        articleElement = document.querySelector('.unified-article-card');
                    }
                    
                    // 3. Check Visibility / Existence
                    if (!articleElement || articleElement.offsetParent === null) {
                        return;
                    }

                    const scrollTop = window.scrollY || document.documentElement.scrollTop;
                    const windowHeight = window.innerHeight;
                    const rect = articleElement.getBoundingClientRect();
                    
                    // Use Top relative to viewport + scroll for absolute page position
                    const elementTop = rect.top + scrollTop;
                    const elementHeight = articleElement.offsetHeight;

                    if (elementHeight === 0) return;

                    const startPoint = elementTop;
                    const endPoint = elementTop + elementHeight - windowHeight;

                    // Calculation
                    let pct = 0;
                    if (endPoint > startPoint) {
                        pct = ((scrollTop - startPoint) / (endPoint - startPoint)) * 100;
                    }
                    
                    pct = Math.max(0, Math.min(100, pct));
                    progressBar.style.width = pct + "%";

                } catch (e) {
                    console.error(e);
                } finally {
                    ticking = false;
                }
            }

            function onScroll() {
                if (!ticking) {
                    window.requestAnimationFrame(updateProgress);
                    ticking = true;
                }
            }

            // Observer needs to be attached to BODY to catch if the wrapper itself is replaced
            const observer = new MutationObserver(() => {
                onScroll();
            });
            
            observer.observe(document.body, { childList: true, subtree: true, attributes: true });

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

// Regex to replace the script block
const jsRegex = /<script>\s*\/\/\s*Progress Bar Logic[\s\S]*?<\/script>/;
if (jsRegex.test(content)) {
    content = content.replace(jsRegex, newJS);
    console.log("Updated JS block with Zombie Check logic.");
    fs.writeFileSync(filePath, content, 'utf8');
} else {
    console.error("JS block not found via Regex!");
    process.exit(1);
}

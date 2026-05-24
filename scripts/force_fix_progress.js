const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'article-detail.html');
let content = fs.readFileSync(filePath, 'utf8');

// The new robust, stateless RAF code
const newScript = `    <script>
        // Progress Bar Logic (Stateless & Instant)
        document.addEventListener('DOMContentLoaded', () => {
            const progressBar = document.getElementById('reading-progress');
            let articleElement = null;
            let ticking = false;

            function updateProgress() {
                // 1. Lazy Target
                if (!progressBar) return;
                if (!articleElement) articleElement = document.querySelector('.unified-article-card');
                if (!articleElement) { ticking = false; return; }

                // 2. Metrics (Current State)
                const scrollTop = window.scrollY || document.documentElement.scrollTop;
                const windowHeight = window.innerHeight;
                const rect = articleElement.getBoundingClientRect();
                
                // Absolute Position
                const elementTop = rect.top + scrollTop;
                const elementHeight = articleElement.offsetHeight;

                // 3. Define Zone
                // Start: Top of article hits top of viewport
                const startPoint = elementTop;
                // End: Bottom of article hits bottom of viewport
                const endPoint = elementTop + elementHeight - windowHeight;

                // 4. Calculate %
                let pct = 0;
                // Prevent division by zero or negative range
                if (endPoint > startPoint) {
                    // Stateless calculation: (Current - Start) / (Total Range)
                    pct = ((scrollTop - startPoint) / (endPoint - startPoint)) * 100;
                }

                // 5. Clamp directly (0-100)
                // This allows it to go back to 0 if we scroll up, or stick to 100 if we go past.
                pct = Math.max(0, Math.min(100, pct));

                progressBar.style.width = pct + "%";
                ticking = false;
            }

            // Scroll Handler (RAF)
            function onScroll() {
                if (!ticking) {
                    window.requestAnimationFrame(updateProgress);
                    ticking = true;
                }
            }

            // Observer
            const observer = new MutationObserver(() => { onScroll(); });
            const wrapper = document.getElementById('article-wrapper') || document.body;
            observer.observe(wrapper, { childList: true, subtree: true, attributes: true });

            // Listeners
            window.addEventListener('scroll', onScroll, { passive: true });
            window.addEventListener('resize', onScroll);
            
            // Initial kicks
            setTimeout(onScroll, 100);
            setTimeout(onScroll, 500);
        });
    </script>`;

// Regex to find the specific script block. 
// We look for <script> followed by "Progress Bar Logic" (ignoring case/whitespace) and ending with </script>
const regex = /<script>\s*\/\/\s*Progress Bar Logic[\s\S]*?<\/script>/;

if (regex.test(content)) {
    console.log("Found target script block. Replacing...");
    const newContent = content.replace(regex, newScript);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log("Successfully updated article-detail.html");
} else {
    console.error("Could not find the target script block with regex!");
    // Fallback: try to locate headers or valid anchors if regex fails
    process.exit(1);
}

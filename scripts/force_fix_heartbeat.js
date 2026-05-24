const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'article-detail.html');
let content = fs.readFileSync(filePath, 'utf8');

// New JS: HEARTBEAT & DEBOUNCE
const newJS = `    <script>
        // Progress Bar Logic (Heartbeat & Self-Healing)
        document.addEventListener('DOMContentLoaded', () => {
            const progressBar = document.getElementById('reading-progress');
            let articleElement = null;
            let ticking = false;

            // Main Update Function
            function updateProgress() {
                try {
                    if (!progressBar) return;

                    // 1. Zombie Check
                    if (articleElement && !articleElement.isConnected) {
                        articleElement = null; 
                    }

                    // 2. Locate
                    if (!articleElement) {
                        articleElement = document.querySelector('.unified-article-card');
                    }
                    
                    // 3. Visibility Check we can trust
                    // If no element, we can't show progress.
                    if (!articleElement) return;

                    // 4. Metrics
                    const scrollTop = window.scrollY || document.documentElement.scrollTop;
                    const windowHeight = window.innerHeight;
                    const rect = articleElement.getBoundingClientRect();
                    
                    // Absolute Calcs
                    const elementTop = rect.top + scrollTop;
                    const elementHeight = articleElement.offsetHeight;

                    if (elementHeight === 0) return;

                    const startPoint = elementTop;
                    const endPoint = elementTop + elementHeight - windowHeight;

                    // 5. Calculate & Apply
                    let pct = 0;
                    if (endPoint > startPoint) {
                        pct = ((scrollTop - startPoint) / (endPoint - startPoint)) * 100;
                    }
                    
                    // Direct application (Unthrottled for smoothness)
                    progressBar.style.width = Math.max(0, Math.min(100, pct)) + "%";

                } catch (e) {
                    console.error("PB Error:", e);
                } finally {
                    ticking = false;
                }
            }

            // Scroll Handler (RAF)
            function onScroll() {
                if (!ticking) {
                    window.requestAnimationFrame(updateProgress);
                    ticking = true;
                }
            }

            // 1. Scroll Listener (Primary)
            window.addEventListener('scroll', onScroll, { passive: true });
            window.addEventListener('resize', onScroll);

            // 2. Debounced Observer (Secondary - for resizing content)
            let observerTimer;
            const observer = new MutationObserver(() => {
                if (observerTimer) clearTimeout(observerTimer);
                observerTimer = setTimeout(onScroll, 200); // Wait for layout to settle
            });
            // Watch body to catch all dynamic changes
            observer.observe(document.body, { childList: true, subtree: true, attributes: false });

            // 3. HEARTBEAT (The Failsafe)
            // Even if everything else dies, this checks every 1 second
            // preventing "permanent freeze"
            setInterval(updateProgress, 1000);
            
            // Initial kick
            updateProgress();
        });
    </script>`;

// Regex to replace the script block
const jsRegex = /<script>\s*\/\/\s*Progress Bar Logic[\s\S]*?<\/script>/;
if (jsRegex.test(content)) {
    content = content.replace(jsRegex, newJS);
    console.log("Updated JS block with Heartbeat logic.");
    fs.writeFileSync(filePath, content, 'utf8');
} else {
    console.error("JS block not found via Regex!");
    process.exit(1);
}

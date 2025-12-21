
// === ARTICLE SLIDER LOGIC ===
let similarArticles = [];
let sliderIndex = 0;

async function loadArticleSlider(currentId) {
    try {
        // Fetch recent articles (simplest "related" logic for now)
        // Optionally filter by category if we had that info handy, but general recent is fine.
        const res = await fetch(`${API_BASE}/articles?limit=10`);
        if (!res.ok) return;

        const all = await res.json();
        // Filter out current article
        similarArticles = all.filter(a => a.id != currentId);

        renderSlider();
    } catch (e) {
        console.error('Slider load error:', e);
        document.getElementById('similar-articles-section').style.display = 'none';
    }
}

function renderSlider() {
    const track = document.getElementById('similar-slider-track');
    if (similarArticles.length === 0) {
        document.getElementById('similar-articles-section').style.display = 'none';
        return;
    }

    track.innerHTML = similarArticles.map(article => `
                <div class="article-card" style="min-width: 300px; max-width: 300px; flex-shrink: 0; display: flex; flex-direction: column; background: var(--card-bg); border-radius: 12px; overflow: hidden; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color);">
                    <div style="height: 180px; overflow: hidden;">
                        <img src="${article.image_url || 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80'}" 
                             alt="${article.title}" 
                             style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div style="padding: 16px; flex: 1; display: flex; flex-direction: column;">
                        <span style="font-size: 0.75rem; color: var(--primary-color); font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">${article.category || 'Genel'}</span>
                        <h4 style="font-size: 1.1rem; color: var(--text-color); margin: 0 0 10px 0; line-height: 1.4;">
                            <a href="article-detail.html?id=${article.id}" style="text-decoration: none; color: inherit;">${article.title}</a>
                        </h4>
                        <div style="margin-top: auto; display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted);">
                             <span>${new Date(article.created_at).toLocaleDateString('tr-TR')}</span>
                             <span><i class="ph ph-eye"></i> ${article.views || 0}</span>
                        </div>
                    </div>
                </div>
            `).join('');
}

function slideArticles(direction) {
    const track = document.getElementById('similar-slider-track');
    const cardWidth = 320; // 300px width + 20px gap
    const visibleWidth = document.querySelector('.similar-slider-wrapper').offsetWidth;
    const maxScroll = (similarArticles.length * cardWidth) - visibleWidth;

    if (direction === 'left') {
        sliderIndex = Math.max(sliderIndex - cardWidth, 0);
    } else {
        sliderIndex = Math.min(sliderIndex + cardWidth, maxScroll);
    }

    track.style.transform = `translateX(-${sliderIndex}px)`;
}

// Base API URL
var API_URL = '/api';

// --- HELPER: Resolve Image Path ---
function resolveImagePath(url) {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('//') || url.startsWith('data:')) return url;
    url = url.replace(/\\/g, '/');
    if (url.startsWith('/')) return url;
    return '/' + url;
}


// Global Article ID for interactions
window.currentArticleId = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DEBUG: DOMContentLoaded started');

    // Connection Check
    fetch(`${API_URL}/settings`)
        .then(res => {
            if (!res.ok) showToast('Sunucu bağlantı hatası (API)', 'error');
        })
        .catch(err => {
            console.error('API Check Error:', err);
            showToast('Sunucuya bağlanılamadı. Lütfen node server.js çalıştığından emin olun.', 'error');
        });

    // --- Global Loader Logic ---
    Promise.all([
        loadSettings(),
        loadHero()
    ]).then(() => {
        hideLoader();
    }).catch(err => {
        console.error('Loader Promise Error:', err);
        hideLoader(); // Hide anyway on error
    });

    // Fallback safety timeout
    setTimeout(hideLoader, 3000);

    loadMenus();
    checkAuthStatus();
    initTheme();
    initSearch(); // Initialize Search
    initLanguageSwitcher(); // Add Language Support
    loadUserInfo();
    setupMobileMenu();
    updateActiveNavLink();

    loadShowcase();
    loadFrontendCategories(); // Dynamic Categories
    initCategoryScroll(); // Initialize Category Scroll Logic
    initCategoryScroll(); // Initialize Category Scroll Logic
    initHeroScroll(); // Force Scroll Logic

    if (window.location.pathname.includes('articles.html')) {
        loadArticlesPage();
    }

    if (window.location.pathname.includes('article-detail.html') || window.location.pathname.includes('/makale/') || window.location.pathname.includes('/article/')) {
        loadArticleDetail();
    }

    // Header Scroll Effect
    window.addEventListener('scroll', () => {
        const header = document.querySelector('.header');
        if (!header) return; // FIX: Author panel has no .header
        if (window.scrollY > 20) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    /* === PASSWORD RESET LOGIC === */
    const forgotForm = document.getElementById('forgot-password-form');
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgot-email').value;
            try {
                const res = await fetch(`${API_URL}/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                if (res.ok) {
                    showToast(data.message, 'success');
                    closeModal('forgotPasswordModal');
                    if (data.devToken) console.log("%c[DEV] Reset Token:", "color:cyan; font-weight:bold;", data.devToken);
                } else {
                    showToast(data.message, 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Bir hata oluştu.', 'error');
            }
        });
    }

    const resetForm = document.getElementById('reset-password-form');
    if (resetForm) {
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPassword = document.getElementById('reset-new-password').value;
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');

            if (!token) {
                showToast('Geçersiz işlem.', 'error');
                return;
            }

            try {
                const res = await fetch(`${API_URL}/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, newPassword })
                });
                const data = await res.json();
                if (res.ok) {
                    showToast(data.message, 'success');
                    closeModal('resetPasswordModal');
                    window.history.replaceState({}, document.title, window.location.pathname);
                    setTimeout(() => openModal('loginModal'), 500);
                } else {
                    showToast(data.message, 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Bir hata oluştu.', 'error');
            }
        });
    }

    // Check for Reset Token on Load
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('token')) {
        setTimeout(() => {
            openModal('resetPasswordModal');
        }, 500); // Small delay to ensure modals are ready
    }
});

let heroInterval; // Global for sorting or stopping if needed

async function loadHero() {
    const sliderContainer = document.getElementById('slider-container');
    const heroTitle = document.getElementById('hero-title') || document.getElementById('articles-hero-title') || document.getElementById('about-hero-title');
    const heroDesc = document.getElementById('hero-description') || document.getElementById('articles-hero-description') || document.getElementById('about-hero-description');

    // --- PART 1: TEXT & SETTINGS ---
    try {
        // Fetch Settings for Text
        const settingsRes = await fetch(`${API_URL}/settings`);
        const settings = await settingsRes.json();

        // Determine which title/desc to use based on page
        let titleToUse = null;
        let descToUse = null;

        if (window.location.pathname.includes('articles.html')) {
            if (settings.articles_hero_title) titleToUse = settings.articles_hero_title;
            if (settings.articles_hero_desc) descToUse = settings.articles_hero_desc;
        } else if (window.location.pathname.includes('about.html')) {
            if (settings.about_hero_title) titleToUse = settings.about_hero_title;
            if (settings.about_hero_desc) descToUse = settings.about_hero_desc;
        } else {
            // Homepage Fallback
            titleToUse = settings.homepage_hero_title || settings.hero_title;
            descToUse = settings.homepage_hero_desc || settings.hero_description;
        }

        // Render "Biz Kimiz" Section Content
        const aboutUsTitleEl = document.getElementById('about-us-title-display');
        const aboutUsDescEl = document.getElementById('about-us-desc-display');
        const aboutUsImgEl = document.getElementById('about-us-image-display');

        if (aboutUsTitleEl && settings.about_us_title) {
            const parts = settings.about_us_title.split('|');
            if (parts.length > 1) {
                aboutUsTitleEl.innerHTML = `${parts[0]} <span style="background: linear-gradient(135deg, #6366f1, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${parts[1]}</span>`;
            } else {
                aboutUsTitleEl.textContent = settings.about_us_title;
            }
        }

        if (aboutUsDescEl && settings.about_us_desc) aboutUsDescEl.innerHTML = settings.about_us_desc.split('\n').map(line => `<p style="margin-bottom: 16px;">${line}</p>`).join('');
        if (aboutUsImgEl && settings.about_us_image) aboutUsImgEl.src = settings.about_us_image;

        // Footer Socials (Dynamic Visibility)
        const socialMap = {
            'footer-twitter': settings.social_twitter,
            'footer-instagram': settings.social_instagram,
            'footer-linkedin': settings.social_linkedin,
            'footer-youtube': settings.social_youtube
        };

        for (const [id, url] of Object.entries(socialMap)) {
            const el = document.getElementById(id);
            if (el) {
                if (url && url.trim() !== '') {
                    el.href = url;
                    el.style.display = 'inline-flex'; // Show
                } else {
                    el.style.display = 'none'; // Hide
                }
            }
        }

        // Render Vision Content
        const visionTitleEl = document.getElementById('vision-title-display');
        const visionDescEl = document.getElementById('vision-desc-display');

        if (visionTitleEl && settings.vision_title) visionTitleEl.textContent = settings.vision_title;
        if (visionDescEl && settings.vision_desc) visionDescEl.textContent = settings.vision_desc;

        // Render Contact Card Content
        const contactTitleEl = document.getElementById('contact-card-title-display');
        const contactDescEl = document.getElementById('contact-card-desc-display');
        const contactEmailTextEl = document.getElementById('contact-card-email-text');
        const contactEmailBtnEl = document.getElementById('contact-card-email-btn');

        if (contactTitleEl && settings.contact_card_title) contactTitleEl.textContent = settings.contact_card_title;
        if (contactDescEl && settings.contact_card_desc) contactDescEl.textContent = settings.contact_card_desc;
        if (settings.contact_card_email) {
            if (contactEmailTextEl) contactEmailTextEl.textContent = settings.contact_card_email;
            if (contactEmailBtnEl) contactEmailBtnEl.href = `mailto:${settings.contact_card_email}`;
        }

        if (titleToUse) {
            // Dynamic accent color based on ID
            let accentColor = settings.homepage_hero_title_color;
            if (heroTitle) {
                let customRendered = false;

                if (heroTitle.id === 'articles-hero-title') {
                    accentColor = settings.articles_hero_title_color;

                    if (titleToUse.trim().toLowerCase().includes('makale')) {
                        heroTitle.innerHTML = `<span style="color: #ffffff;">Maka</span><span style="color: #6366f1 !important;">leler</span>`;
                        customRendered = true;
                    }
                }

                // Specific Layout for "Modern Bilim"
                // Req: Line 1: Modern (White)
                //      Line 2: Bilimin (White) Dijital (Purple)
                //      Line 3: Platformu (Purple)
                // We assume this is the main hero title if it matches content
                if (!customRendered && (titleToUse.includes('Modern Bilimin') || titleToUse.includes('Modern Bilim'))) {
                    // Check if this is likely the homepage hero (checked via ID logic externally but here we match content)
                    // Reconstruct strict HTML:
                    // <span white>Modern <br mobile> Bilimin</span> <span purple>Dijital <br mobile> Platformu</span>
                    const p1 = "Modern <br class='mobile-br'> Bilimin";
                    const p2 = "Dijital <br class='mobile-br'> Platformu";

                    heroTitle.innerHTML = `<span style="color: #ffffff;">${p1}</span> <span style="color: ${settings.homepage_hero_title_color || '#6366f1'} !important;">${p2}</span>`;
                    customRendered = true;
                }

                if (heroTitle.id === 'about-hero-title') accentColor = settings.about_hero_title_color;
            }
        }

        // --- Global Loader Logo Logic ---
        const loaderLogoImg = document.getElementById('loader-logo-img');
        const loaderIcon = document.querySelector('.loader-icon');

        // If settings has a logo URL, swap the icon for the image
        if (settings.site_logo && settings.site_logo.trim() !== "" && loaderLogoImg) {
            console.log('Setting loader logo:', settings.site_logo); // Debug
            loaderLogoImg.src = settings.site_logo;
            loaderLogoImg.style.display = 'block';
            if (loaderIcon) loaderIcon.style.display = 'none';
        }

        console.log('Settings loaded:', settings);
        // --- END PART 1 ---

        if (titleToUse) {
            // Dynamic accent color based on ID
            let accentColor = settings.homepage_hero_title_color;
            if (heroTitle) {
                let customRendered = false;

                if (heroTitle.id === 'articles-hero-title') {
                    accentColor = settings.articles_hero_title_color;

                    if (titleToUse.trim().toLowerCase().includes('makale')) {
                        heroTitle.innerHTML = `<span style="color: #ffffff;">Maka</span><span style="color: #6366f1 !important;">leler</span>`;
                        customRendered = true;
                    }
                }

                // Specific Layout for "Modern Bilim"
                // Req: Line 1: Modern (White)
                //      Line 2: Bilimin (White) Dijital (Purple)
                //      Line 3: Platformu (Purple)
                // We assume this is the main hero title if it matches content
                if (!customRendered && (titleToUse.includes('Modern Bilimin') || titleToUse.includes('Modern Bilim'))) {
                    // Check if this is likely the homepage hero (checked via ID logic externally but here we match content)
                    // Reconstruct strict HTML:
                    // <span white>Modern <br mobile> Bilimin</span> <span purple>Dijital <br mobile> Platformu</span>
                    const p1 = "Modern <br class='mobile-br'> Bilimin";
                    const p2 = "Dijital <br class='mobile-br'> Platformu";

                    heroTitle.innerHTML = `<span style="color: #ffffff;">${p1}</span> <span style="color: ${settings.homepage_hero_title_color || '#6366f1'} !important;">${p2}</span>`;
                    customRendered = true;
                }

                if (heroTitle.id === 'about-hero-title') accentColor = settings.about_hero_title_color;

                if (!customRendered) {
                    const isCleanWhite = !accentColor || accentColor.toLowerCase() === '#ffffff';
                    let useCleanWhite = isCleanWhite;

                    // 1. Decode HTML entities
                    const txt = document.createElement('textarea');
                    txt.innerHTML = titleToUse;
                    let decodedTitle = txt.value;

                    // 2. Normalize Vertical Bars
                    decodedTitle = decodedTitle.replace(/[¦│｜∣￨]/g, '|');

                    // 3. Simple Split Strategy
                    let parts = null;

                    if (decodedTitle.includes('|')) {
                        parts = decodedTitle.split('|');
                    }

                    if (parts && parts.length > 1) {
                        const part1 = parts[0].trim();
                        const part2 = parts.slice(1).join(' ').trim();

                        if (useCleanWhite) {
                            heroTitle.innerHTML = `<span style="color: #ffffff;">${part1}</span> <span style="color: #ffffff;">${part2}</span>`;
                        } else {
                            heroTitle.innerHTML = `<span style="color: #ffffff !important;">${part1}</span> <span style="color: ${accentColor.trim()} !important;">${part2}</span>`;
                        }
                    } else {
                        heroTitle.innerHTML = titleToUse;
                        if (useCleanWhite) {
                            heroTitle.style.color = '#ffffff';
                        } else {
                            heroTitle.style.color = accentColor;
                        }
                        // Reset lingering styles
                        heroTitle.style.background = 'none';
                        heroTitle.style.webkitTextFillColor = 'initial';
                        heroTitle.style.webkitBackgroundClip = 'initial';
                        heroTitle.style.backgroundClip = 'initial';
                        heroTitle.style.opacity = '1';
                        heroTitle.style.display = 'block';
                    }
                }
            }

            // Update Description if exists
            if (heroDesc && descToUse) {
                heroDesc.textContent = descToUse;
            }
        }
    } catch (e) {
        console.error('Hero Text Load Error:', e);
    }

    // --- PART 2: SLIDES (Independent) ---
    if (sliderContainer) {
        try {
            const slidesRes = await fetch(`${API_URL}/hero-slides`);
            const slides = await slidesRes.json();

            if (slides.length > 0) {
                sliderContainer.innerHTML = '';
                slides.forEach((slide, index) => {
                    const div = document.createElement('div');
                    div.className = `hero-slide ${index === 0 ? 'active' : ''}`;
                    div.style.backgroundImage = `url('${slide.image_url}')`;
                    sliderContainer.appendChild(div);
                });

                if (slides.length > 1) {
                    startHeroLoop(slides.length);
                }
            }
        } catch (e) {
            console.error('Hero Slides Load Error:', e);
        }
    }
}

function startHeroLoop(count) {
    let currentIndex = 0;
    const slides = document.querySelectorAll('.hero-slide');

    if (heroInterval) clearInterval(heroInterval);

    heroInterval = setInterval(() => {
        slides[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % count;
        slides[currentIndex].classList.add('active');
    }, 5000); // 5 Seconds
}

// --- Theme Toggle ---
function initTheme() {
    const themeBtn = document.getElementById('themeToggle');
    if (!themeBtn) return;

    // Check saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeBtn.innerHTML = '<i class="ph ph-sun"></i>';
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeBtn.innerHTML = '<i class="ph ph-moon"></i>';
    }

    themeBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            themeBtn.innerHTML = '<i class="ph ph-moon"></i>';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeBtn.innerHTML = '<i class="ph ph-sun"></i>';
        }
    });
}

// --- Expanding Search Bar ---
function initSearch() {
    const searchContainer = document.querySelector('.search-container');
    const searchBtn = document.querySelector('.search-btn');
    const searchInput = document.querySelector('.search-input');

    if (searchBtn && searchContainer && searchInput) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // Perform search if active and has text
            if (searchContainer.classList.contains('active') && searchInput.value.trim().length > 0) {
                window.location.href = `articles.html?search=${encodeURIComponent(searchInput.value.trim())}`;
                return;
            }

            // Toggle active state
            searchContainer.classList.toggle('active');

            // Handle Nav Visibility
            const navMenu = document.querySelector('.nav-menu');
            if (navMenu) {
                if (searchContainer.classList.contains('active')) {
                    navMenu.classList.add('nav-hidden');
                } else {
                    navMenu.classList.remove('nav-hidden');
                }
            }

            // Focus input if opening
            if (searchContainer.classList.contains('active')) {
                searchInput.focus();
            }
        });

        // Search on Enter
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && searchInput.value.trim().length > 0) {
                window.location.href = `articles.html?search=${encodeURIComponent(searchInput.value.trim())}`;
            }
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchContainer.contains(e.target) && !searchBtn.contains(e.target) && searchContainer.classList.contains('active')) {
                // Don't close if user is typing or interacting with input
                // But generally clicking 'outside' container means outside input too.
                searchContainer.classList.remove('active');
                const navMenu = document.querySelector('.nav-menu');
                if (navMenu) navMenu.classList.remove('nav-hidden');
            }
        });
    }
}


// --- Toast Notifications ---
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ph-info';
    if (type === 'success') icon = 'ph-check-circle';
    if (type === 'error') icon = 'ph-warning-circle';

    toast.innerHTML = `<i class="ph-fill ${icon}"></i> <span>${message}</span>`;

    container.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Dynamic Settings ---
// --- Dynamic Settings ---
async function loadSettings() {
    try {
        const res = await fetch(`${API_URL}/settings`);
        const settings = res.ok ? await res.json() : {};

        // Update Title - Safe Check
        const siteTitle = settings.site_title || '';
        if (siteTitle.trim() === '') {
            if (!document.title.includes(' - ')) document.title = 'AperionX'; // Default only if no specific page title
            document.querySelectorAll('.logo-text').forEach(el => el.style.display = 'none');
        } else {
            document.title = siteTitle;
            document.querySelectorAll('.logo-text').forEach(el => {
                el.innerText = siteTitle;
                el.style.display = 'block';
            });
        }
        // Continue to other settings


        // Update Logo (Header & Favicon)
        if (settings.site_logo) {
            // Update Favicon
            let link = document.querySelector("link[rel~='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.href = settings.site_logo;

            // Update Header Logo
            const logoContainer = document.querySelector('.logo');
            if (logoContainer) {
                logoContainer.innerHTML = '';

                // 1. Image
                const img = document.createElement('img');
                img.src = settings.site_logo;
                img.alt = settings.site_title || 'Logo';

                // Height Logic
                const height = settings.logo_height ? `${settings.logo_height}px` : '36px';
                img.style.height = height;
                img.style.width = 'auto';
                img.style.borderRadius = '8px';

                logoContainer.appendChild(img);

                // 2. Text (Optional)
                if (settings.site_title && settings.site_title.trim() !== "") {
                    // Start with margin if image exists
                    const span = document.createElement('span');
                    span.className = 'logo-text';
                    // span.style.marginLeft = '8px'; // Removed: Handled by CSS .logo gap:8px
                    span.style.color = 'var(--logo-color)';

                    const title = settings.site_title;
                    if (title.endsWith('X')) {
                        span.innerHTML = title.slice(0, -1) + '<span style="color: var(--primary-color)">X</span>';
                    } else {
                        span.innerText = title;
                    }
                    logoContainer.appendChild(span);
                }
            }
        } else {
            // Text-only fallback
            document.querySelectorAll('.logo-text').forEach(el => {
                const title = settings.site_title || 'AperionX';
                if (title.endsWith('X')) {
                    el.innerHTML = title.slice(0, -1) + '<span style="color: var(--primary-color)">X</span>';
                } else {
                    el.innerText = title;
                }
            });
        }

        if (settings.site_favicon) {
            let link = document.querySelector("link[rel~='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.href = settings.site_favicon;
        }

        // --- GLOBAL SEO / SOCIAL SHARE UPDATE ---
        // If we are NOT on an article detail page (which handles its own tags),
        // set the default site image/logo for social sharing.
        if (!window.location.pathname.includes('article-detail.html')) {
            const logoUrl = settings.site_logo
                ? (settings.site_logo.startsWith('http') ? settings.site_logo : window.location.origin + '/' + settings.site_logo.replace(/^\//, ''))
                : window.location.origin + '/uploads/logo.png';

            // Open Graph
            let ogImg = document.querySelector('meta[property="og:image"]');
            if (!ogImg) {
                ogImg = document.createElement('meta');
                ogImg.setAttribute('property', 'og:image');
                document.head.appendChild(ogImg);
            }
            ogImg.setAttribute('content', logoUrl);

            // Twitter
            let twImg = document.querySelector('meta[name="twitter:image"]');
            if (!twImg) {
                twImg = document.createElement('meta');
                twImg.name = 'twitter:image';
                document.head.appendChild(twImg);
            }
            twImg.content = logoUrl;
        }

        // Apply Text Settings
        if (settings.hero_btn_text) {
            const el = document.getElementById('hero-main-btn');
            if (el) el.innerText = settings.hero_btn_text;
        }

        // Showcase Settings
        if (settings.showcase_badge) {
            const el = document.getElementById('showcase-badge-text');
            if (el) el.innerText = settings.showcase_badge;
        }
        if (settings.showcase_title) {
            const el = document.getElementById('showcase-title-text');
            if (el) el.innerHTML = settings.showcase_title;
        }
        if (settings.showcase_desc) {
            const el = document.getElementById('showcase-desc-text');
            if (el) el.innerText = settings.showcase_desc;
        }
        if (settings.showcase_btn_text) {
            const el = document.getElementById('showcase-view-all-text');
            if (el) el.innerHTML = `${settings.showcase_btn_text} <i class="ph-bold ph-arrow-right" style="margin-left:8px;"></i>`;
        }

        // Auth Buttons
        if (settings.auth_login_text) {
            document.querySelectorAll('.btn-login').forEach(btn => {
                if (btn.innerText !== 'Çıkış') btn.innerText = settings.auth_login_text;
            });
        }
        if (settings.auth_signup_text) {
            document.querySelectorAll('.btn-signup').forEach(btn => btn.innerText = settings.auth_signup_text);
        }

        // --- FOOTER DYNAMIC CONTENT ---
        // Footer Description
        if (settings.footer_desc || settings.site_description) {
            document.querySelectorAll('#footer-desc, .footer-desc').forEach(el => {
                el.innerText = settings.footer_desc || settings.site_description;
            });
        }

        // Footer Copyright
        if (settings.footer_copyright || settings.site_title) {
            const el = document.getElementById('footer-copyright-name');
            if (el) el.innerText = settings.footer_copyright || settings.site_title;
        }

        // Footer Logo Text matches Site Title
        if (settings.site_title) {
            const footerLogoText = document.querySelector('.footer-logo .logo-text');
            if (footerLogoText) footerLogoText.innerText = settings.site_title;
        }

        // Footer Logo Image
        if (settings.site_logo) {
            const footerLogoLink = document.querySelector('.footer-logo');
            if (footerLogoLink) {
                const iconBox = footerLogoLink.querySelector('.logo-icon');
                if (iconBox) {
                    const img = document.createElement('img');
                    img.src = settings.site_logo;
                    img.alt = settings.site_title || 'Site Logo';
                    img.style.height = '48px';
                    img.style.width = 'auto';
                    img.style.borderRadius = '8px';
                    footerLogoLink.replaceChild(img, iconBox);
                }
            }
        }

        // Contact & Socials
        if (settings.contact_email) {
            const el = document.getElementById('footer-email');
            if (el) { el.innerText = settings.contact_email; el.href = 'mailto:' + settings.contact_email; }
        }

        // Social Links Update using classes for broader reach
        if (settings.social_twitter) {
            document.querySelectorAll('#footer-twitter, .footer-twitter').forEach(el => {
                el.href = settings.social_twitter; el.style.display = 'flex';
            });
        } else {
            document.querySelectorAll('#footer-twitter, .footer-twitter').forEach(el => {
                el.style.display = 'none';
            });
        }

        if (settings.social_instagram) {
            document.querySelectorAll('#footer-instagram, .footer-instagram').forEach(el => {
                el.href = settings.social_instagram; el.style.display = 'flex';
            });
        } else {
            document.querySelectorAll('#footer-instagram, .footer-instagram').forEach(el => {
                el.style.display = 'none';
            });
        }

        // Ensure Social Container exists for LinkedIn/YouTube
        const socialContainer = document.querySelector('.footer-socials');
        if (socialContainer) {
            // LinkedIn
            let lnk = document.getElementById('footer-linkedin');
            if (settings.social_linkedin) {
                if (!lnk) {
                    lnk = document.createElement('a');
                    lnk.id = 'footer-linkedin';
                    lnk.className = 'social-link';
                    lnk.target = '_blank';
                    lnk.innerHTML = '<i class="ph-fill ph-linkedin-logo"></i>';
                    socialContainer.appendChild(lnk);
                }
                lnk.href = settings.social_linkedin;
                lnk.style.display = 'flex';
            } else if (lnk) { lnk.style.display = 'none'; }

            // YouTube
            let yt = document.getElementById('footer-youtube');
            if (settings.social_youtube) {
                if (!yt) {
                    yt = document.createElement('a');
                    yt.id = 'footer-youtube';
                    yt.className = 'social-link';
                    yt.target = '_blank';
                    yt.innerHTML = '<i class="ph-fill ph-youtube-logo"></i>';
                    socialContainer.appendChild(yt);
                }
                yt.href = settings.social_youtube;
                yt.style.display = 'flex';
            } else if (yt) { yt.style.display = 'none'; }
        }

        if (settings.newsletter_title) {
            const el = document.getElementById('newsletter-title');
            if (el) el.innerText = settings.newsletter_title;
        }
        if (settings.newsletter_desc) {
            const el = document.getElementById('newsletter-desc');
            if (el) el.innerText = settings.newsletter_desc;
        }

    } catch (error) {
        console.error('Settings load error:', error);
    }
}

// --- Dynamic Menus ---
// --- Dynamic Menus ---
async function loadMenus() {
    try {
        const res = await fetch(`${API_URL}/menu?t=${Date.now()}`); // Cache busting
        if (!res.ok) return;
        const menus = await res.json();

        if (menus.length === 0) return; // Keep default if empty

        // Standardize Home Link
        menus.forEach(m => {
            if (m.url === 'index.html' || m.label === 'Ana Sayfa') m.url = '/';
        });

        const navMenu = document.querySelector('.nav-menu');
        const mobileMenu = document.querySelector('.mobile-menu');

        // Get current page filename
        let currentPath = window.location.pathname;
        if (currentPath === '/' || currentPath.endsWith('/index.html') || currentPath.endsWith('index.html')) {
            currentPath = '/';
        } else {
            currentPath = currentPath.split('/').pop();
        }

        // Clear existing (except auth buttons in mobile)
        if (navMenu) navMenu.innerHTML = '';

        // Fetch categories ONCE for both menus
        let categories = [];
        try {
            const catRes = await fetch(`${API_URL}/categories?t=${Date.now()}`);
            if (catRes.ok) categories = await catRes.json();
        } catch (e) {
            console.error('Failed to load categories for menu dropdown', e);
        }

        // Rebuild Desktop
        if (navMenu) {


            menus.forEach(menu => {
                // Check if this is the "Categories" menu item
                // matching by label roughly or url
                const isCategoryMenu = menu.label.toLowerCase().includes('kategori');

                if (isCategoryMenu && categories.length > 0) {
                    // Create Dropdown Structure
                    const dropdownContainer = document.createElement('div');
                    dropdownContainer.className = 'nav-item-dropdown';

                    const mainLink = document.createElement('a');
                    if (menu.label === 'Hakkında') menu.url = 'about.html'; // Override for About page
                    mainLink.href = menu.url; // Usually '#' or 'articles.html'
                    mainLink.className = 'nav-link';
                    mainLink.innerText = menu.label;
                    if (menu.url === currentPath) mainLink.classList.add('active');

                    // Add Icon for visual cue
                    mainLink.innerHTML += ' <i class="ph-bold ph-caret-down" style="font-size: 0.8em; margin-left: 4px; transition: transform 0.2s;"></i>';

                    // TOGGLE LOGIC (Click instead of Hover)
                    mainLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        // Close other dropdowns if any (future proofing)
                        document.querySelectorAll('.nav-item-dropdown.active').forEach(el => {
                            if (el !== dropdownContainer) el.classList.remove('active');
                        });

                        dropdownContainer.classList.toggle('active');
                    });

                    // Close when clicking outside
                    document.addEventListener('click', (e) => {
                        if (!dropdownContainer.contains(e.target)) {
                            dropdownContainer.classList.remove('active');
                        }
                    });

                    const dropdownContent = document.createElement('div');
                    dropdownContent.className = 'nav-dropdown-content';

                    // "Tümü" (All) link removed as per user request
                    // Categories only

                    categories.forEach(cat => {
                        const catLink = document.createElement('a');
                        catLink.href = `articles.html?category=${encodeURIComponent(cat.name)}`;
                        catLink.className = 'dropdown-link';
                        catLink.innerText = cat.name;
                        dropdownContent.appendChild(catLink);
                    });

                    dropdownContainer.appendChild(mainLink);
                    dropdownContainer.appendChild(dropdownContent);
                    navMenu.appendChild(dropdownContainer);
                } else {
                    // Standard Link
                    const a = document.createElement('a');
                    if (menu.label === 'Hakkında') menu.url = 'about.html'; // Override for About page
                    a.href = menu.url;
                    a.className = 'nav-link';
                    a.innerText = menu.label;

                    // Add active class if matches
                    if (menu.url === currentPath) {
                        a.classList.add('active');
                    }
                    navMenu.appendChild(a);
                }
            });
        }

        // Rebuild Mobile (Safely)
        if (mobileMenu) {
            // Find or invoke container
            let linksContainer = mobileMenu.querySelector('.mobile-links-container');

            if (!linksContainer) {
                // Determine insertion point: before auth buttons if they exist
                let mobileAuth = mobileMenu.querySelector('.mobile-auth');

                // 1. Ensure Auth Container Exists (Crucial for author-profile.html which starts empty)
                if (!mobileAuth) {
                    mobileAuth = document.createElement('div');
                    mobileAuth.className = 'mobile-auth';
                    mobileAuth.style.marginTop = 'auto'; // Push to bottom
                    mobileAuth.style.padding = '20px';
                    mobileAuth.style.display = 'flex';
                    mobileAuth.style.flexDirection = 'column';
                    mobileAuth.style.gap = '10px';
                    mobileAuth.style.borderTop = '1px solid rgba(255,255,255,0.1)';

                    // Default Content (Login/Signup) - will be updated by checkAuthStatus
                    mobileAuth.innerHTML = `
                        <button class="btn btn-login" onclick="openModal('loginModal')" style="width:100%;">Giriş Yap</button>
                        <button class="btn btn-signup" onclick="openModal('signupModal')" style="width:100%;">Kayıt Ol</button>
                    `;

                    mobileMenu.appendChild(mobileAuth);

                    // Trigger Re-check to populate if logged in
                    setTimeout(checkAuthStatus, 100);
                }

                linksContainer = document.createElement('div');
                linksContainer.className = 'mobile-links-container';
                linksContainer.style.width = '100%';
                linksContainer.style.display = 'flex';
                linksContainer.style.flexDirection = 'column';
                linksContainer.style.gap = '8px';

                if (mobileAuth) {
                    mobileMenu.insertBefore(linksContainer, mobileAuth);
                } else {
                    mobileMenu.appendChild(linksContainer);
                }
            } else {
                linksContainer.innerHTML = ''; // safely clear only links
            }

            menus.forEach(menu => {
                const isCategoryMenu = menu.label.toLowerCase().includes('kategori');

                if (isCategoryMenu && categories.length > 0) {
                    // Mobile Dropdown Accordion
                    const dropdownDiv = document.createElement('div');
                    dropdownDiv.className = 'mobile-nav-dropdown';

                    const header = document.createElement('div');
                    header.className = 'mobile-dropdown-header';
                    header.innerHTML = `<span>${menu.label}</span> <i class="ph-bold ph-caret-down"></i>`;

                    const content = document.createElement('div');
                    content.className = 'mobile-dropdown-content';

                    // "Tümü" removed for mobile as well

                    categories.forEach(cat => {
                        const catLink = document.createElement('a');
                        catLink.href = `articles.html?category=${encodeURIComponent(cat.name)}`;
                        catLink.className = 'mobile-dropdown-link';
                        catLink.innerText = cat.name;
                        catLink.addEventListener('click', (e) => e.stopPropagation()); // Prevent closing
                        content.appendChild(catLink);
                    });

                    // Toggle Logic
                    header.addEventListener('click', (e) => {
                        e.stopPropagation();
                        content.classList.toggle('active');
                        // Rotate arrow
                        const icon = header.querySelector('i');
                        if (content.classList.contains('active')) {
                            // Close others
                            document.querySelectorAll('.mobile-dropdown-content.active').forEach(el => {
                                if (el !== content) {
                                    el.classList.remove('active');
                                    if (el.previousElementSibling) el.previousElementSibling.querySelector('i').style.transform = 'rotate(0deg)';
                                }
                            });
                            icon.style.transform = 'rotate(180deg)';
                        } else {
                            icon.style.transform = 'rotate(0deg)';
                        }
                    });

                    dropdownDiv.appendChild(header);
                    dropdownDiv.appendChild(content);
                    linksContainer.appendChild(dropdownDiv);

                } else {
                    // Standard Link
                    const a = document.createElement('a');
                    a.href = menu.url;
                    a.className = 'nav-link mobile-link-item';
                    a.innerText = menu.label;

                    if (menu.url === currentPath) {
                        a.classList.add('active');
                    }
                    linksContainer.appendChild(a);
                }
            });
        }

    } catch (error) {
        console.error('Menu load error:', error);
    }
}

// --- Modals ---
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// --- Mobile Menu Logic ---
// --- Mobile Menu Logic ---
function setupMobileMenu() {
    const btn = document.getElementById('hamburgerBtn');
    const nav = document.querySelector('.nav-menu');
    const header = document.querySelector('.header');

    // --- Mobile Menu Toggle Logic ---
    if (btn && nav) {
        btn.addEventListener('click', () => {
            nav.classList.toggle('active');
            btn.classList.toggle('active');

            // Lock body
            if (nav.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });

        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
                btn.classList.remove('active');
                document.body.style.overflow = '';
            });
        });

        document.addEventListener('click', (e) => {
            if (!nav.contains(e.target) && !btn.contains(e.target) && nav.classList.contains('active')) {
                nav.classList.remove('active');
                btn.classList.remove('active');
                document.body.style.overflow = '';
            }
        });

        // Handle Resize (Hide if desktop)
        window.addEventListener('resize', () => {
            if (window.innerWidth > 1200) {
                // If the menu is active on desktop, close it and unlock scroll
                if (nav.classList.contains('active')) {
                    nav.classList.remove('active');
                    btn.classList.remove('active');
                    document.body.style.overflow = '';
                }
            }
        });
    }
}
function switchModal(closeId, openId) {
    closeModal(closeId);
    setTimeout(() => openModal(openId), 200); // Small delay for smooth transition
}

// Close modal on click outside
window.onclick = function (event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// --- Auth Logic ---

// Signup
const signupForm = document.querySelector('#signupModal form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullname = document.getElementById('signup-fullname').value;
        const username = document.getElementById('signup-username').value; // Added
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirm = document.getElementById('signup-confirm').value;

        if (password !== confirm) {
            showToast('Şifreler eşleşmiyor!', 'error');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullname, username, email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                showToast(data.message || 'Kayıt başarısız.', 'error');
            } else {
                showToast('Kayıt başarılı! Lütfen giriş yapın.', 'success');
                switchModal('signupModal', 'loginModal');
            }
        } catch (error) {
            console.error(error);
            showToast('Bir hata oluştu.', 'error');
        }
    });
}

// Login
const loginForm = document.querySelector('#loginModal form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('login-email').value; // Email or Username
        const password = document.getElementById('login-password').value;

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password })
            });

            const data = await res.json();

            if (!res.ok) {
                showToast(data.message || 'Giriş başarısız.', 'error');
            } else {
                // DEBUG: Verify Token
                // alert('Login Response: ' + JSON.stringify(data));
                if (!data.token) {
                    alert('HATA: Sunucu token göndermedi! Giriş başarısız sayılıyor.');
                    return;
                }

                // Store Token and User Info
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                console.log('Login Success. Token saved:', data.token);
                // alert('Giriş Başarılı! Token kaydedildi: ' + data.token.substring(0, 10) + '...');

                showToast('Giriş başarılı!', 'success');
                closeModal('loginModal');
                checkAuthStatus(); // Update UI

                if (data.redirectUrl) {
                    setTimeout(() => window.location.href = data.redirectUrl, 1000);
                } else if (data.user.role === 'admin') {
                    setTimeout(() => window.location.href = 'admin.html', 1000); // Fallback
                } else if (data.user.role === 'editor') {
                    setTimeout(() => window.location.href = 'editor.html', 1000);
                } else if (data.user.role === 'author') {
                    setTimeout(() => window.location.href = 'author.html', 1000);
                }
            }
        } catch (error) {
            console.error(error);
            showToast('Bir hata oluştu.', 'error');
        }
    });
}

// XSS Protection Helper
function escapeHtml(text) {
    if (!text) return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// NEW: Global Navigation Handler - Defined ONCE globally at TOP
// (Updated v118 - Force Refresh)
window.navigateToDashboard = function () {
    try {
        console.log("navigateToDashboard called");
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            console.warn("No user found in localStorage, redirecting to home.");
            window.location.href = 'index.html';
            return;
        }

        const u = JSON.parse(userStr);
        console.log('Navigating dashboard for role:', u.role);

        if (u.role === 'admin') window.location.href = 'admin.html';
        else if (u.role === 'author') window.location.href = 'author.html';
        else if (u.role === 'editor') window.location.href = 'editor.html';
        else window.location.href = 'profile.html';
    } catch (err) {
        console.error("Navigation Error:", err);
        window.location.href = 'index.html';
    }
};

// NEW: Logout Handler - Defined ONCE globally at TOP
window.logout = function () {
    console.log('Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
};

// Check Auth & Update UI
function checkAuthStatus() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    const authButtons = document.querySelectorAll('.auth-buttons, .mobile-auth');

    // FIX: Zombie Session Detection
    // If we have a user object but NO token, the session is invalid.
    if (user && !token) {
        console.warn('Zombie session detected (User set, Token missing).');
        // TEMPORARILY DISABLED AUTO-LOGOUT FOR DEBUGGING
        // localStorage.removeItem('user'); 
        // alert('Debug: Token eksik ama oturum açık görünüyor. Lütfen sayfayı yenileyin.');
    }

    if (user && token) {
        authButtons.forEach(container => {
            let titleAttr = 'Profilime Git';
            if (user.role === 'admin') titleAttr = 'Admin Paneli';
            else if (user.role === 'author') titleAttr = 'Yazar Paneli';
            else if (user.role === 'editor') titleAttr = 'Editör Paneli';

            // SIMPLE, DIRECT ONCLICK - NO EVENT LISTENERS
            container.innerHTML = `
                <button type="button" class="btn btn-login" onclick="window.navigateToDashboard();" title="${titleAttr}" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <span class="user-name">${escapeHtml(user.fullname)}</span>
                    <i class="ph-fill ph-user-circle" style="font-size: 1.2rem;"></i>
                </button>
                <button type="button" class="btn btn-login btn-sm" onclick="window.logout();">Çıkış</button>
            `;

            // Add Profile/Dashboard Link to Nav if not present
            const navMenu = document.querySelector('.nav-menu');
            if (navMenu) {
                // Clear specialized links first to prevent duplicates on re-render
                const existingSpecial = navMenu.querySelectorAll('.special-nav-link');
                existingSpecial.forEach(el => el.remove());

                // 1. Profile Link for ALL users
                const profileLink = document.createElement('a');
                profileLink.href = 'profile.html';
                profileLink.className = 'nav-link special-nav-link';
                profileLink.innerText = 'Profilim';
                navMenu.appendChild(profileLink);

                // 2. Admin/Dashboard Link
                if (user.role === 'admin') {
                    const adminLink = document.createElement('a');
                    adminLink.href = 'admin.html';
                    adminLink.className = 'nav-link special-nav-link admin-link';
                    adminLink.innerHTML = '<i class="ph-fill ph-gear"></i> Admin';
                    adminLink.style.color = 'var(--primary-color)';
                    navMenu.appendChild(adminLink);
                } else if (user.role === 'author') {
                    const authorLink = document.createElement('a');
                    authorLink.href = 'author.html';
                    authorLink.className = 'nav-link special-nav-link author-link';
                    authorLink.innerHTML = '<i class="ph-fill ph-pencil-simple"></i> Yazar Paneli';
                    authorLink.style.color = '#10b981'; // Emerald Green distinction
                    navMenu.appendChild(authorLink);
                } else if (user.role === 'editor') {
                    const editorLink = document.createElement('a');
                    editorLink.href = 'editor.html';
                    editorLink.className = 'nav-link special-nav-link editor-link';
                    editorLink.innerText = 'Editör Paneli';
                    navMenu.appendChild(editorLink);
                }
            }
        });
    } else {
        // Reset to Login/Signup
        authButtons.forEach(container => {
            container.innerHTML = `
                <button class="btn btn-login" onclick="openModal('loginModal')">Giriş Yap</button>
                <button class="btn btn-signup" onclick="openModal('signupModal')">Kayıt Ol</button>
            `;
        });

        // Remove functionality links
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu) {
            const existingSpecial = navMenu.querySelectorAll('.special-nav-link');
            existingSpecial.forEach(el => el.remove());
        }
    }
}


function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}
// Expose globally for onclick handlers
window.logout = logout;

// --- Mobile Menu Toggle ---
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobileMenu = document.getElementById('mobileMenu');

if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.addEventListener('click', () => {
        const isActive = mobileMenu.classList.contains('active');
        if (isActive) {
            mobileMenu.classList.remove('active');
            hamburgerBtn.innerHTML = '<i class="ph ph-list"></i>';
        } else {
            mobileMenu.classList.add('active');
            hamburgerBtn.innerHTML = '<i class="ph ph-x"></i>';
        }
    });
}

// --- Showcase Loader ---
async function loadShowcase() {
    try {
        const sliderContainer = document.getElementById('showcase-grid');
        console.log('DEBUG: loadShowcase started, container:', sliderContainer);
        if (!sliderContainer) return; // Only run if showcase exists

        // 1. Fetch Settings & Articles in Parallel
        const [settingsRes, articlesRes] = await Promise.all([
            fetch(`${API_URL}/settings`),
            fetch(`${API_URL}/articles`)
        ]);

        console.log('DEBUG: Fetch results:', settingsRes.status, articlesRes.status);

        if (!settingsRes.ok || !articlesRes.ok) {
            console.error('DEBUG: One of the fetches failed');
            return;
        }

        console.log('DEBUG: Fetch OK');

        const settings = await settingsRes.json();
        const allArticles = await articlesRes.json(); // Already sorted by date desc

        // 2. Determine Slots
        // Default: Top 3
        let slots = [allArticles[0], allArticles[1], allArticles[2]];

        // Override with User Selections
        if (settings.homepage_article_1) {
            const art = allArticles.find(a => a.id == settings.homepage_article_1);
            if (art) slots[0] = art;
        }
        if (settings.homepage_article_2) {
            const art = allArticles.find(a => a.id == settings.homepage_article_2);
            if (art) slots[1] = art;
        }
        if (settings.homepage_article_3) {
            const art = allArticles.find(a => a.id == settings.homepage_article_3);
            if (art) slots[2] = art;
        }

        // 3. Render
        slots.forEach((item, index) => {
            if (!item) return; // Should not happen unless < 3 articles total

            const cardId = `showcase-card-${index + 1}`;
            const card = document.getElementById(cardId);
            if (card) {
                // Determine category or other meta if available, else static
                // Using image_url from article or default
                const bgImage = resolveImagePath(item.image_url) || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop';
                const author = item.author_name || 'Aperion Yazar';
                const category = item.category || 'Genel';

                // Text-Over-Image Structure for ALL cards
                console.log(`[DEBUG] Rendering Card ${index + 1}:`, { title: item.title, author, bgImage });

                card.innerHTML = `
                    <div class="card-bg" style="background-image: url('${bgImage}'); background-color: #1e293b;"></div>
                    <div class="card-overlay"></div>
                    
                    <div class="card-top-content">
                        <span class="category-badge-glass">${category}</span>
                    </div>

                    <div class="card-bottom-content">
                        <h3 class="card-title">${item.title}</h3>
                        <div class="card-meta-row">
                        <div class="card-meta-row">
                             <div class="author-name" style="text-decoration:none; color:inherit; z-index:10; position:relative;">
                             ${(item.authors && item.authors.length > 0)
                        ? `<span style="display:inline-flex; align-items:center; gap:4px; flex-wrap:wrap;">
                                    ${item.authors.map((a, idx) => `
                                        ${idx > 0 ? '<span style="opacity:0.7">,</span>' : ''}
                                        <a href="author-profile.html?u=${a.id}" style="color:inherit; text-decoration:none;">${escapeHtml(a.fullname)}</a>
                                    `).join('')}
                                   </span>`
                        : `<a href="author-profile.html?u=${(item.author_name || '').replace(/ /g, '-')}" style="color:inherit; text-decoration:none;">${author}</a>`
                    }
                             </div>
                        </div>
                        </div>
                    </div>
                    
                    <a href="${item.slug ? '/makale/' + item.slug : '/article-detail.html?id=' + item.id}" class="read-btn-circle"><i class="ph-bold ph-arrow-right"></i></a>
                    <a href="${item.slug ? '/makale/' + item.slug : '/article-detail.html?id=' + item.id}" class="card-link-full" style="position: absolute; top:0; left:0; width:100%; height:100%; z-index: 1;"></a>
                `;
            }
        });
    } catch (error) {
        console.error('Showcase load error:', error);
    }
}

// Global Scroll Handler
window.scrollToShowcase = function () {
    console.log("Scroll triggered!");
    const showcase = document.querySelector('.showcase');
    if (showcase) {
        // Offset for fixed header if needed (approx 80px)
        const headerOffset = 100;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = showcase.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - headerOffset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    } else {
        console.error("Showcase section not found!");
    }
};

// Event Delegation for robustness

document.addEventListener('click', function (e) {
    const btn = e.target.closest('#hero-main-btn'); // Robust check
    if (btn) {
        e.preventDefault();
        window.scrollToShowcase();
    }
});

// --- HELPER: XSS Protection ---
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// --- Newsletter Logic ---
const newsletterForm = document.getElementById('newsletter-form');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('newsletter-email');
        const email = emailInput.value;
        const btn = newsletterForm.querySelector('button');
        const originalText = btn.innerHTML;

        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> İşleniyor...';

            const res = await fetch(`${API_URL}/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (res.ok) {
                showToast(data.message || 'Teşekkürler, kaydınız alındı!', 'success');
                emailInput.value = '';
            } else {
                showToast(data.message || 'Bir hata oluştu.', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Sunucu hatası.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });
}

let pageArticles = [];
let filteredArticles = [];
let currentPage = 1;
const itemsPerPage = 6;



async function loadArticlesPage() {
    console.log('Loading Articles Page...');
    const grid = document.getElementById('articles-grid');
    if (!grid) return; // Not on articles page

    try {
        // Fetch all published articles
        const res = await fetch(`${API_URL}/articles`);
        if (!res.ok) throw new Error('API Error');
        pageArticles = await res.json();

        // Initial Sort (Newest first)
        pageArticles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        filteredArticles = [...pageArticles];

        // Check URL Params for Category
        const urlParams = new URLSearchParams(window.location.search);
        const catParam = urlParams.get('category');
        if (catParam) {
            // Activate chip
            const chips = document.querySelectorAll('.filter-chip');
            chips.forEach(c => {
                if (c.innerText === catParam) {
                    c.click(); // Trigger click logic
                }
            });
            // If manual filter needed:
            filterPageArticles(catParam, null);
        } else {
            // Check URL Params for Search
            const searchParam = urlParams.get('search');
            if (searchParam) {
                // Pre-fill input if exists
                const searchInput = document.getElementById('article-search-input');
                if (searchInput) {
                    searchInput.value = searchParam;
                }
                searchPageArticles(searchParam);
            } else {
                renderArticlesGrid();
            }
        }

    } catch (e) {
        console.error('Articles Page Error:', e);
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px;">Hata oluştu: ${escapeHtml(e.message)}</div>`;
    }
}

function filterPageArticles(category, btnElement) {
    // UI Update
    if (btnElement) {
        document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
    }

    if (category === 'all') {
        filteredArticles = [...pageArticles];
    } else {
        filteredArticles = pageArticles.filter(a => a.category === category);
    }

    currentPage = 1;
    renderArticlesGrid();
}

function searchPageArticles(query) {
    const term = query.toLowerCase();

    filteredArticles = pageArticles.filter(a =>
        (a.title && a.title.toLowerCase().includes(term)) ||
        (a.excerpt && a.excerpt.toLowerCase().includes(term)) ||
        (a.tags && a.tags.toLowerCase().includes(term))
    );

    currentPage = 1;
    renderArticlesGrid();
}

function renderArticlesGrid() {
    const grid = document.getElementById('articles-grid');
    const pagination = document.getElementById('pagination-container');

    if (!grid) return;

    // Filter Logic
    // If we are just rendering page, we rely on filteredArticles state

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const toRender = filteredArticles.slice(start, end);

    // Scroll to top of grid smoothly if it's a page change (optional, but nice)
    // if (currentPage > 1) { ... }

    grid.innerHTML = ''; // Always clear for page replacement

    if (filteredArticles.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:60px; color:#64748b; font-size:1.1rem;">Aradığınız kriterlere uygun makale bulunamadı.</div>`;
        if (pagination) pagination.style.display = 'none';
        return;
    }

    toRender.forEach(article => {
        const bgMeasure = resolveImagePath(article.image_url) || 'https://via.placeholder.com/600x400';
        const safeTitle = escapeHtml(article.title);
        const safecategory = escapeHtml(article.category || 'Genel');
        const safeAuthor = escapeHtml(article.author_name || 'Yazar');

        const html = `
            <article class="featured-card small" style="min-height: 350px; cursor: pointer; position: relative;">
                <div class="card-bg" style="background-image: url('${bgMeasure}')"></div>
                <div class="card-overlay" style="pointer-events: none;"></div>
                
                <div class="card-top-content" style="pointer-events: none;">
                     <span class="category-badge-glass">${safecategory}</span>
                </div>
                
                <div class="card-bottom-content" style="pointer-events: none;">
                    <h3 class="card-title" style="font-size: 1.5rem; margin-bottom: 8px;">${safeTitle}</h3>
            <div class="author-name" style="font-size: 0.85rem; opacity: 0.9; position: relative; z-index: 12; pointer-events: auto;">
                ${(article.authors && article.authors.length > 0)
                ? `<div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                        ${article.authors.map((a, idx) => `
                            ${idx > 0 ? '<span style="opacity:0.7">,</span>' : ''}
                            <a href="author-profile.html?u=${a.id}" style="color: inherit; text-decoration: none;">${escapeHtml(a.fullname)}</a>
                        `).join('')}
                       </div>`
                : `<a href="author-profile.html?u=${(article.author_name || '').replace(/ /g, '-')}" style="color: inherit; text-decoration: none; display: flex; align-items: center; gap: 6px;">
                        ${safeAuthor}
                       </a>`
            }
            </div>
                </div>

                <a href="${article.slug ? '/makale/' + article.slug : '/article-detail.html?id=' + article.id}" class="read-btn-circle" style="pointer-events: auto; z-index: 10;"><i class="ph-bold ph-arrow-right"></i></a>
                <a href="${article.slug ? '/makale/' + article.slug : '/article-detail.html?id=' + article.id}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 5;"></a>
            </article>
        `;
        grid.innerHTML += html;
    });

    // Numeric Pagination Logic
    renderPaginationControls();
}

function renderPaginationControls() {
    const pagination = document.getElementById('pagination-container');
    if (!pagination) return;

    const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);

    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'flex';
    pagination.innerHTML = '';

    // Previous
    // const prevBtn = document.createElement('button'); ... (Optional)

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        btn.innerText = i;
        btn.onclick = () => {
            currentPage = i;
            renderArticlesGrid();
            // Scroll to top of grid
            const grid = document.getElementById('articles-grid');
            if (grid) {
                const headerOffset = 150;
                const elementPosition = grid.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
            }
        };
        pagination.appendChild(btn);
    }
}

// Load Article Detail Page
async function loadArticleDetail() {
    console.log('[DEBUG] loadArticleDetail called');
    console.log('[DEBUG] window.SERVER_ARTICLE:', window.SERVER_ARTICLE);

    // 1. Check for SSR Preloaded Data (Hydration)
    if (window.SERVER_ARTICLE) {
        console.log('[DEBUG] Calling renderArticleDetail with SSR data');
        renderArticleDetail(window.SERVER_ARTICLE);
        return;
    }

    // 2. Fallback: Client-side Fetch (e.g. if navigated via SPA or legacy link without redirect)
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        // Try parsing slug from path if not query param
        // e.g. /makale/slug-name
        const pathParts = window.location.pathname.split('/');
        const possibleSlug = pathParts[pathParts.length - 1]; // naive check
        if (!possibleSlug || possibleSlug === 'article-detail.html') {
            window.location.href = '/articles.html';
            return;
        }
        // Fetch by slug if logic allows
        try {
            // Force cache busting with timestamp
            const res = await fetch(`/api/articles/${possibleSlug}?t=${Date.now()}`);
            if (!res.ok) throw new Error('Makale bulunamadı');

            const article = await res.json();
            renderArticleDetail(article);
            return;
        } catch (e) {
            console.error('Slug fetch failed:', e);
            document.body.innerHTML = '<h1 style="color:red; padding:50px;">HATA: Makale Yüklenemedi</h1><p style="padding:0 50px;">' + e.toString() + '</p>';
            // window.location.href = '/articles.html'; // DISABLE REDIRECT FOR DEBUGGING
            return;
        }
    }

    try {
        // Force cache busting with timestamp
        const res = await fetch(`/api/articles/${id}?t=${Date.now()}`);
        if (!res.ok) throw new Error('Makale bulunamadı');

        const article = await res.json();
        renderArticleDetail(article);

    } catch (e) { console.error(e); }
}

function renderArticleDetail(article) {
    // Render content
    document.getElementById('loading-indicator').style.display = 'none';
    document.getElementById('article-wrapper').style.display = 'block';

    // Set Meta & Title
    document.title = `${article.title} - AperionX`;

    // Update SEO Meta Tags
    // Update SEO Meta Tags
    const desc = article.excerpt || article.title;
    const origin = window.location.origin;

    // 1. Determine Article Image URL
    let imgUrl = article.image_url ? article.image_url.replace(/\\/g, '/') : '';
    if (imgUrl && !imgUrl.startsWith('http')) {
        imgUrl = `${origin}/${imgUrl.startsWith('/') ? imgUrl.slice(1) : imgUrl}`;
    }

    // 2. Fetch Site Logo for Fallback logic
    let siteLogoUrl = '';
    try {
        // Retrieve from settings if already loaded, otherwise fetch or default
        // This part might need to be adjusted if settings are not globally available or preloaded
        // For now, assuming API_URL is defined and settings can be fetched.
        // If settings are always preloaded, this fetch can be removed.
        const settingsRes = fetch(`${API_URL}/settings`); // Use fetch directly, not await here
        settingsRes.then(res => res.json()).then(settings => {
            if (settings.site_logo) {
                siteLogoUrl = settings.site_logo;
                if (!siteLogoUrl.startsWith('http')) {
                    siteLogoUrl = `${origin}/${siteLogoUrl.startsWith('/') ? siteLogoUrl.slice(1) : siteLogoUrl}`;
                }
            }
            // Re-evaluate finalImg and update meta tags after siteLogoUrl is determined
            const finalImg = imgUrl || siteLogoUrl || `${origin}/uploads/logo.png`;
            document.querySelector('meta[property="og:image"]')?.setAttribute("content", finalImg);
            document.querySelector('meta[name="twitter:image"]')?.setAttribute("content", finalImg);
        }).catch(e => console.error("Failed to load settings for site logo:", e));

    } catch (e) { } // Catch for the initial try block, not the promise

    // 3. Final Image Decision (Article Image > Site Logo > Default Placeholder)
    // This will be initially set, and potentially updated by the settings fetch above
    const finalImg = imgUrl || siteLogoUrl || `${origin}/uploads/logo.png`;


    // --- Standard Meta ---
    document.querySelector('meta[name="description"]')?.setAttribute("content", desc);

    // --- Open Graph (Facebook/WhatsApp/LinkedIn) ---
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", article.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", desc);
    document.querySelector('meta[property="og:image"]')?.setAttribute("content", finalImg);
    document.querySelector('meta[property="og:url"]')?.setAttribute("content", window.location.href);
    document.querySelector('meta[property="og:type"]')?.setAttribute("content", "article");

    // --- Twitter Card ---
    let twCard = document.querySelector('meta[name="twitter:card"]');
    if (!twCard) {
        twCard = document.createElement('meta');
        twCard.name = "twitter:card";
        document.head.appendChild(twCard);
    }
    twCard.content = "summary_large_image";

    let twTitle = document.querySelector('meta[name="twitter:title"]');
    if (!twTitle) {
        twTitle = document.createElement('meta');
        twTitle.name = "twitter:title";
        document.head.appendChild(twTitle);
    }
    twTitle.content = article.title;

    let twDesc = document.querySelector('meta[name="twitter:description"]');
    if (!twDesc) {
        twDesc = document.createElement('meta');
        twDesc.name = "twitter:description";
        document.head.appendChild(twDesc);
    }
    twDesc.content = desc;

    let twImg = document.querySelector('meta[name="twitter:image"]');
    if (!twImg) {
        twImg = document.createElement('meta');
        twImg.name = "twitter:image";
        document.head.appendChild(twImg);
    }
    twImg.content = finalImg;

    // Inner Content
    document.getElementById('detail-category').innerText = article.category || 'Genel';
    document.getElementById('detail-date').innerHTML = `<i class="ph ph-calendar"></i> ${new Date(article.created_at).toLocaleDateString('tr-TR')}`;
    // Multi-author Support
    // Multi-author Support
    // MERGE: Ensure article.authors is populated from SSR global if missing
    if ((!article.authors || article.authors.length === 0) && window.SERVER_AUTHORS) {
        article.authors = window.SERVER_AUTHORS;
    }

    if (article.authors && Array.isArray(article.authors) && article.authors.length > 0) {
        const authorsHtml = article.authors.map((a, index) => {
            const separator = index > 0 ? '<span style="margin: 0 4px;">,</span>' : '';
            return `${separator}<a href="author-profile.html?u=${a.id}" style="color: inherit; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">${escapeHtml(a.fullname)}</a>`;
        }).join('');
        document.getElementById('detail-author').innerHTML = `<div style="display:inline-flex; align-items:center; flex-wrap:wrap;"><i class="ph ph-users" style="margin-right:6px;"></i> ${authorsHtml}</div>`;
    } else {
        // Fallback for legacy single author
        // Use SERVER_AUTHOR if available (though SERVER_AUTHORS is preferred now)
        const safeAuthorName = article.author_name || (window.SERVER_AUTHORS ? window.SERVER_AUTHORS[0]?.fullname : null) || 'AperionX Yazarı';

        if (article.author_id) {
            document.getElementById('detail-author').innerHTML = `<a href="author-profile.html?u=${article.author_id}" style="color: inherit; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;"><i class="ph ph-user"></i> ${safeAuthorName}</a>`;
        } else {
            document.getElementById('detail-author').innerHTML = `<i class="ph ph-user"></i> ${safeAuthorName}`;
        }
    }

    document.getElementById('detail-title').innerText = article.title;

    // Excerpt
    const excerptEl = document.getElementById('detail-excerpt');
    if (article.excerpt) {
        excerptEl.innerText = article.excerpt;
        document.getElementById('summary-box').style.display = 'block';
    } else {
        document.getElementById('summary-box').style.display = 'none';
    }

    const img = document.getElementById('detail-image');
    if (article.image_url) {
        img.src = resolveImagePath(article.image_url);
        img.alt = article.title; // SEO Alt Tag
    } else {
        img.style.display = 'none';
    }

    // Tags
    const tagsContainer = document.getElementById('detail-tags');
    if (article.tags) {
        tagsContainer.innerHTML = '';
        const tags = article.tags.split(',').map(t => t.trim());
        tags.forEach(tag => {
            if (tag) {
                tagsContainer.innerHTML += `<span class="tag-chip">#${tag}</span>`;
            }
        });
        tagsContainer.style.display = 'none';
    }

    // References
    const refSection = document.getElementById('references-section');

    if (article.references_list && refSection) {
        // Clear and rebuild section content
        refSection.innerHTML = '';

        // Removed Main "Kaynakça" Title as requested
        /* 
        const mainTitle = document.createElement('h3');
        mainTitle.className = 'references-title';
        mainTitle.innerText = 'Kaynakça';
        refSection.appendChild(mainTitle); 
        */

        const allRefs = article.references_list;
        let textRefs = [];
        let imgRefs = [];

        if (allRefs.includes('[IMAGES]')) {
            const parts = allRefs.split('[IMAGES]');
            textRefs = parts[0].trim().split('\n').filter(r => r.trim());
            imgRefs = parts[1].trim().split('\n').filter(r => r.trim());
        } else {
            textRefs = allRefs.split('\n').filter(r => r.trim());
        }

        // 1. Text References
        if (textRefs.length > 0) {
            const groupDiv = document.createElement('div');
            groupDiv.style.marginTop = '20px';

            const subHeader = document.createElement('h4');
            subHeader.innerText = 'Metindeki Kaynaklar';
            // Styling to look clean and standard
            subHeader.style.cssText = 'color: var(--text-color); font-size: 1.1rem; font-weight: 700; margin-bottom: 12px; border-left: 4px solid var(--primary-accent); padding-left: 10px;';
            groupDiv.appendChild(subHeader);

            const ul = document.createElement('ul');
            ul.style.listStyle = 'none'; // Remove default numbering
            ul.style.padding = '0';
            ul.style.margin = '0';

            textRefs.forEach((ref, index) => {
                const li = document.createElement('li');
                li.id = `ref-text-${index + 1}`;
                li.style.cssText = 'margin-bottom: 12px; line-height: 1.6; font-size: 0.95rem; color: var(--text-color); padding-left: 0;';

                // Manual numbering to match superscript format [1]
                li.innerHTML = `<span style="font-weight: 700; color: var(--primary-accent); margin-right: 8px;">[${index + 1}]</span>${escapeHtml(ref)}`;
                ul.appendChild(li);
            });
            groupDiv.appendChild(ul);
            refSection.appendChild(groupDiv);
        }

        // 2. Image References
        if (imgRefs.length > 0) {
            const groupDiv = document.createElement('div');
            groupDiv.style.marginTop = '30px';

            const subHeader = document.createElement('h4');
            subHeader.innerText = 'Görseldeki Kaynaklar';
            subHeader.style.cssText = 'color: var(--text-color); font-size: 1.1rem; font-weight: 700; margin-bottom: 12px; border-left: 4px solid var(--primary-accent); padding-left: 10px;';
            groupDiv.appendChild(subHeader);

            const ul = document.createElement('ul');
            ul.style.listStyle = 'none';
            ul.style.padding = '0';
            ul.style.margin = '0';

            imgRefs.forEach((ref, index) => {
                const li = document.createElement('li');
                li.id = `ref-img-${index + 1}`;
                li.style.cssText = 'margin-bottom: 10px; line-height: 1.6; font-size: 0.95rem; color: var(--text-color); display: flex; align-items: start;';

                li.innerHTML = `<i class="ph-fill ph-image" style="margin-right: 8px; margin-top: 4px; color: var(--primary-accent);"></i><span>${escapeHtml(ref)}</span>`;
                ul.appendChild(li);
            });
            groupDiv.appendChild(ul);
            refSection.appendChild(groupDiv);
        }

        refSection.style.display = 'block';

        // --- Handle Superscript Clicks in Content ---
        setTimeout(() => {
            const contentDiv = document.getElementById('detail-content');
            if (contentDiv) {
                const sups = contentDiv.getElementsByTagName('sup');
                Array.from(sups).forEach(sup => {
                    const txt = sup.innerText.trim();
                    if (/^\d+$/.test(txt)) {
                        sup.style.cursor = 'pointer';
                        sup.style.color = 'var(--primary-accent)';
                        sup.style.fontWeight = 'bold';
                        sup.title = 'Kaynağa Git';
                        sup.onclick = () => {
                            const targetId = `ref-text-${txt}`;
                            const target = document.getElementById(targetId);
                            if (target) {
                                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                target.style.transition = 'background 0.3s ease-out';
                                // Use a more subtle highlight color that works in both modes
                                target.style.backgroundColor = 'rgba(99, 102, 241, 0.2)'; // Primary color low opacity
                                target.style.borderRadius = '4px';
                                setTimeout(() => {
                                    target.style.backgroundColor = 'transparent';
                                }, 800); // Reduced from 2000ms to 800ms
                            }
                        };
                    }
                });
            }
        }, 100);

    } else if (refSection) {
        refSection.style.display = 'none';
    }

    // Content & Image Fix (Windows Path)
    let contentHtml = article.content || '';
    contentHtml = contentHtml.replace(/\\/g, '/'); // Fix all backslashes
    document.getElementById('detail-content').innerHTML = contentHtml;

    // Load Interactions
    const articleId = article.id;
    window.currentArticleId = articleId; // Store globally for like/comment functions
    loadLikes(articleId);
    loadComments(articleId);
    if (typeof loadArticleSlider === 'function') loadArticleSlider(articleId);

    // --- Social Share Buttons ---
    const twitterBtn = document.querySelector('.share-icon.twitter');
    const whatsappBtn = document.querySelector('.share-icon.whatsapp');
    const linkedinBtn = document.querySelector('.share-icon.linkedin');
    const instagramBtn = document.querySelector('.share-icon.instagram');

    const shareUrl = window.location.href;
    const shareTitle = article.title;

    if (twitterBtn) {
        twitterBtn.onclick = (e) => {
            e.preventDefault();
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
        };
    }

    if (whatsappBtn) {
        whatsappBtn.onclick = (e) => {
            e.preventDefault();
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`, '_blank');
        };
    }

    if (linkedinBtn) {
        linkedinBtn.onclick = (e) => {
            e.preventDefault();
            window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
        };
    }

    if (instagramBtn) {
        instagramBtn.onclick = (e) => {
            e.preventDefault();
            // Instagram doesn't support direct URL sharing, copy link to clipboard
            navigator.clipboard.writeText(shareUrl).then(() => {
                showToast('Bağlantı kopyalandı! Instagram\'da paylaşabilirsiniz.', 'success');
            }).catch(() => {
                showToast('Bağlantı kopyalanamadı.', 'error');
            });
        };
    }



}

// --- Dynamic Frontend Categories & Settings ---
async function loadFrontendCategories() {
    const list = document.getElementById('category-filters');

    // Also load Page Titles if on Articles Page
    const sliderTitle = document.getElementById('articles-slider-title');
    const listTitle = document.getElementById('articles-list-title');

    // Also Newsletter Texts (Global)
    const newsTitle = document.getElementById('newsletter-title-text');
    const newsDesc = document.getElementById('newsletter-desc-text');

    try {
        // Fetch Settings & Categories in parallel or sequence
        // Optimized: parallel
        const [catRes, setRes] = await Promise.all([
            fetch(`${API_URL}/categories`),
            fetch(`${API_URL}/settings`)
        ]);

        if (setRes.ok) {
            const settings = await setRes.json();
            if (sliderTitle && settings.articles_page_slider_title) sliderTitle.innerText = settings.articles_page_slider_title;
            if (listTitle && settings.articles_page_list_title) listTitle.innerText = settings.articles_page_list_title;

            // Article Hero Settings
            if (sliderTitle && settings.articles_page_slider_title) sliderTitle.innerText = settings.articles_page_slider_title;
            if (listTitle && settings.articles_page_list_title) listTitle.innerText = settings.articles_page_list_title;

            // Removed conflicting hero title overwrite (handled by loadHero)

            if (newsTitle && settings.newsletter_section_title) newsTitle.innerText = settings.newsletter_section_title;
            if (newsDesc && settings.newsletter_section_desc) newsDesc.innerText = settings.newsletter_section_desc;
        }

        if (!catRes.ok) return;
        const categories = await catRes.json();

        if (list) {
            categories.forEach(cat => {
                const btn = document.createElement('button');
                btn.className = 'filter-chip';
                btn.innerText = cat.name;
                btn.onclick = function () {
                    filterPageArticles(cat.name, this);
                };
                list.appendChild(btn);
            });

            // Check URL param after render
            const params = new URLSearchParams(window.location.search);
            const activeCat = params.get('category');
            if (activeCat) {
                Array.from(list.children).forEach(child => {
                    if (child.innerText === activeCat) {
                        const allBtn = list.querySelector('.filter-chip.active');
                        if (allBtn) allBtn.classList.remove('active');
                        child.classList.add('active');
                    }
                });
            }
        }

    } catch (e) {
        console.error('Data load error:', e);
    }
}

// --- Category Scroll Logic ---
function initCategoryScroll() {
    const container = document.querySelector('.category-filters');
    const leftBtn = document.querySelector('.scroll-btn.left');
    const rightBtn = document.querySelector('.scroll-btn.right');
    const wrapper = document.querySelector('.category-scroll-wrapper'); // Parent wrapper

    if (!container || !wrapper) return;

    // Scroll Amount
    const scrollAmount = 200;

    // Check Visibility Function
    function updateScrollButtons() {
        // Tolerances for float rounding
        const maxScrollLeft = container.scrollWidth - container.clientWidth;

        // If content fits, hide both (or just wrapper arrows if you want buttons hidden)
        // Better: hide buttons individually

        if (leftBtn) {
            leftBtn.style.display = container.scrollLeft > 10 ? 'flex' : 'none';
        }

        if (rightBtn) {
            // Show if there is more content to scroll to right
            rightBtn.style.display = (container.scrollLeft < maxScrollLeft - 10) ? 'flex' : 'none';
        }
    }

    // Attach Listeners
    if (leftBtn) {
        leftBtn.addEventListener('click', () => {
            container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });
    }

    if (rightBtn) {
        rightBtn.addEventListener('click', () => {
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });
    }

    // Update on scroll and resize
    container.addEventListener('scroll', updateScrollButtons);
    window.addEventListener('resize', updateScrollButtons);

    // Initial check
    setTimeout(updateScrollButtons, 100); // Small delay for rendering
}

// --- SLIDER LOGIC ---
let sliderPosition = 0;
const cardWidth = 300; // 280px width + 20px gap

function slideArticles(direction) {
    const track = document.getElementById('similar-slider-track');
    // Use container width or a fixed multiple
    const containerWidth = document.querySelector('.similar-slider-wrapper').offsetWidth;
    const trackWidth = track.scrollWidth;

    if (direction === 'left') {
        sliderPosition += cardWidth;
        if (sliderPosition > 0) sliderPosition = 0;
    } else {
        const maxScroll = -(trackWidth - containerWidth);
        // Ensure we can go to the very end
        sliderPosition -= cardWidth;

        // Soft limit
        if (sliderPosition < maxScroll) sliderPosition = maxScroll;

        // Reset if content fits
        if (trackWidth <= containerWidth) sliderPosition = 0;
    }

    track.style.transform = `translateX(${sliderPosition}px)`;
}

async function loadArticleSlider(currentId) {
    try {
        // Fetch Settings for Title
        const settingsRes = await fetch(`${API_URL}/settings`);
        const settings = await settingsRes.json();
        if (settings.article_detail_slider_title) {
            const titleEl = document.getElementById('similar-articles-title');
            if (titleEl) titleEl.innerText = settings.article_detail_slider_title;
        }

        // Fetch Articles
        const res = await fetch(`${API_URL}/articles`);
        if (!res.ok) return;
        const allArticles = await res.json();

        // Filter current, maybe randomize or take recent
        const others = allArticles.filter(a => a.id != currentId).slice(0, 10); // Take 10 max

        const track = document.getElementById('similar-slider-track');
        track.innerHTML = '';

        if (others.length === 0) {
            document.getElementById('similar-articles-section').style.display = 'none';
            return;
        }

        others.forEach(art => {
            const card = document.createElement('div');
            card.className = 'similar-article-card';
            // Set Background Image directly
            const bgUrl = art.image_url ? art.image_url.replace(/\\/g, '/') : 'https://via.placeholder.com/300x400';
            card.style.backgroundImage = `url('${bgUrl}')`;

            // New "Full Image" Overlay Structure
            card.innerHTML = `
                <div class="similar-card-overlay">
                     <span class="category-badge-slider">${art.category || 'Genel'}</span>
                     
                     <div class="content-bottom">
                        <a href="${art.slug ? '/makale/' + art.slug : '/article-detail.html?id=' + art.id}" class="similar-card-title">${art.title}</a>
                        <div class="similar-card-meta">
                            ${(art.authors && art.authors.length > 0)
                    ? `<span style="display:inline-flex; gap:4px; flex-wrap:wrap;">
                                    ${art.authors.map((a, idx) => `
                                        ${idx > 0 ? '<span style="opacity:0.7">,</span>' : ''}
                                        <a href="author-profile.html?u=${a.id}" style="color: inherit; text-decoration: none;">${escapeHtml(a.fullname)}</a>
                                    `).join('')}
                                   </span>`
                    : (art.author_id
                        ? `<a href="author-profile.html?u=${art.author_id}" style="color: inherit; text-decoration: none;">${art.author_name || 'Admin'}</a>`
                        : `<span>${art.author_name || 'Admin'}</span>`)
                }
                             <span style="width:4px; height:4px; background:rgba(255,255,255,0.5); border-radius:50%;"></span>
                            <span>${new Date(art.created_at).toLocaleDateString('tr-TR')}</span>
                        </div>
                     </div>
                </div>
            `;
            // Make whole card clickable via JS or CSS apporach
            card.onclick = (e) => {
                // Prevent double click if clicking title
                if (!e.target.closest('a')) {
                    window.location.href = art.slug ? '/makale/' + art.slug : '/article-detail.html?id=' + art.id;
                }
            };

            track.appendChild(card);
        });

    } catch (e) { console.error('Slider load error:', e); }
}

// --- Article Interactions (Likes & Comments) ---

async function loadLikes(id) {
    try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`${API_URL}/articles/${id}/like`, { headers });
        const data = await res.json();

        const btn = document.getElementById('like-btn');
        if (!btn) return;

        if (data.liked) {
            btn.classList.add('liked');
            btn.innerHTML = `<i class="ph-fill ph-heart"></i> Beğendin & Destek Oldun`;
        } else {
            btn.classList.remove('liked');
            btn.innerHTML = `<i class="ph ph-heart"></i> Beğen & Destek Ol`;
        }
    } catch (e) { console.error('Like load error', e); }
}

async function toggleLike() {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Beğenmek için giriş yapmalısınız.', 'error');
        return;
    }

    // Use global article ID instead of URL params (fixes clean URL support)
    const id = window.currentArticleId;
    if (!id) {
        console.error('toggleLike: No article ID found');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/articles/${id}/like`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            loadLikes(id); // Reload UI
        } else {
            showToast('İşlem başarısız.', 'error');
        }
    } catch (e) { console.error(e); }
}

// --- Comments ---

async function loadComments(id) {
    const list = document.getElementById('comments-list');
    if (!list) return;

    try {
        const res = await fetch(`${API_URL}/articles/${id}/comments`);
        const comments = await res.json();

        const countEl = document.getElementById('comment-count');
        if (countEl) countEl.innerText = `(${comments.length})`;

        list.innerHTML = '';
        if (comments.length === 0) {
            list.innerHTML = '<p class="no-comments">Henüz yorum yapılmamış. İlk yorumu sen yap!</p>';
            return;
        }

        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

        comments.forEach(com => {
            const isOwner = currentUser && currentUser.id === com.user_id;
            const dateStr = new Date(com.created_at).toLocaleDateString('tr-TR');

            const div = document.createElement('div');
            div.className = 'comment-item';
            div.innerHTML = `
                <div class="comment-avatar">
                    <span>${com.fullname.charAt(0).toUpperCase()}</span>
                </div>
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">${escapeHtml(com.fullname)}</span>
                        <span class="comment-date">${dateStr}</span>
                        ${isOwner ? `<button class="delete-comment-btn" onclick="deleteComment(${com.id})"><i class="ph ph-trash"></i></button>` : ''}
                    </div>
                    <p class="comment-text">${escapeHtml(com.content)}</p>
                </div>
            `;
            list.appendChild(div);
        });

    } catch (e) { console.error('Comment load error', e); }
}

async function postComment() {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Yorum yapmak için giriş yapmalısınız.', 'error');
        return;
    }

    // Use global article ID instead of URL params (fixes clean URL support)
    const id = window.currentArticleId;
    if (!id) {
        console.error('postComment: No article ID found');
        showToast('Hata: Makale bulunamadı.', 'error');
        return;
    }
    const input = document.getElementById('comment-input');
    const content = input.value.trim();

    if (!content) return;

    try {
        const res = await fetch(`${API_URL}/articles/${id}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });

        if (res.ok) {
            input.value = '';
            showToast('Yorum gönderildi!', 'success');
            loadComments(id);
        } else {
            showToast('Yorum gönderilemedi.', 'error');
        }
    } catch (e) { console.error(e); }
}

async function deleteComment(commentId) {
    if (!confirm('Yorumu silmek istediğinize emin misiniz?')) return;

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/comments/${commentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            showToast('Yorum silindi.', 'success');
            // Use global article ID instead of URL params (fixes clean URL support)
            loadComments(window.currentArticleId);
        } else {
            showToast('Silme başarısız.', 'error');
        }
    } catch (e) { console.error(e); }
}

// --- Helper: Force Hero Scroll ---
function initHeroScroll() {
    const btn = document.getElementById('hero-main-btn');
    if (btn) {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.getElementById('showcase');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                // Fallback for different pages (go to articles)
                window.location.href = 'articles.html';
            }
        });
    }
}

function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader && !loader.classList.contains('hidden')) {
        loader.classList.add('hidden');
        // Remove from DOM after transition
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }
}


// --- Language Switcher ---
function initLanguageSwitcher_OLD() {
    const isEnglish = window.location.pathname.startsWith('/en');

    // Update ALL language buttons (including mobile static)
    const btns = document.querySelectorAll('.lang-btn, #lang-switch-btn, #mobile-lang-btn-static');

    btns.forEach(btn => {
        // Set visual state
        // Use span if it exists inside, otherwise innerHTML
        const span = btn.querySelector('span');

        if (isEnglish) {
            if (span) span.innerText = 'TR';
            else btn.innerHTML = '<i class="ph-bold ph-globe"></i> TR';

            btn.title = "Türkçe'ye Geç";
        } else {
            if (span) span.innerText = 'EN';
            else btn.innerHTML = '<i class="ph-bold ph-globe"></i> EN';

            btn.title = "Switch to English";
        }

        // Click Handler
        btn.onclick = (e) => {
            e.preventDefault();
            if (isEnglish) {
                // Return to Turkish (Remove /en)
                let newPath = window.location.pathname.replace(/^\/en/, '');
                if (newPath === '') newPath = '/';
                window.location.href = newPath + window.location.search;
            } else {
                // Switch to English (Prepend /en)
                let current = window.location.pathname;
                if (current === '/') current = '';
                window.location.href = '/en' + current + window.location.search;
            }
        };
    });
}


// --- Restore: Load User Info ---
async function loadUserInfo() {
    const token = localStorage.getItem('token');
    const userMenuContainer = document.getElementById('user-menu-container');
    const mobileAuth = document.querySelector('.mobile-auth');

    if (token) {
        try {
            const res = await fetch(`${API_URL}/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const user = await res.json();

                // Desktop Header
                if (userMenuContainer) {
                    userMenuContainer.innerHTML = `
                        <div class="user-dropdown">
                            <button class="user-btn" onclick="toggleUserDropdown()">
                                <img src="${user.avatar || 'https://ui-avatars.com/api/?name=' + user.fullname}" alt="User" class="user-avatar-small">
                                <span>${user.fullname.split(' ')[0]}</span>
                                <i class="ph-bold ph-caret-down"></i>
                            </button>
                            <div class="dropdown-menu" id="user-dropdown-menu">
                                ${user.role === 'admin' ? '<a href="admin.html"><i class="ph-bold ph-shield-check"></i> Admin Panel</a>' : ''}
                                ${user.role === 'author' || user.role === 'admin' ? '<a href="author.html"><i class="ph-bold ph-pen-nib"></i> Yazar Paneli</a>' : ''}
                                <a href="profile.html"><i class="ph-bold ph-user"></i> Profilim</a>
                                <a href="#" onclick="logout()"><i class="ph-bold ph-sign-out"></i> Çıkış Yap</a>
                            </div>
                        </div>
                    `;
                }

                // Mobile Menu
                if (mobileAuth) {
                    mobileAuth.innerHTML = `
                        <div class="mobile-user-profile">
                            <img src="${user.avatar || 'https://ui-avatars.com/api/?name=' + user.fullname}" alt="User">
                            <div class="mobile-user-info">
                                <span class="name">${user.fullname}</span>
                                <span class="role">${user.role === 'admin' ? 'Yönetici' : (user.role === 'author' ? 'Yazar' : 'Üye')}</span>
                            </div>
                        </div>
                        <div class="mobile-user-links">
                            ${user.role === 'admin' ? '<a href="admin.html" class="btn btn-outline"><i class="ph-bold ph-shield-check"></i> Admin Panel</a>' : ''}
                            ${user.role === 'author' || user.role === 'admin' ? '<a href="author.html" class="btn btn-outline"><i class="ph-bold ph-pen-nib"></i> Yazar Paneli</a>' : ''}
                            <a href="profile.html" class="btn btn-outline"><i class="ph-bold ph-user"></i> Profil</a>
                            <button onclick="logout()" class="btn btn-primary" style="width:100%">Çıkış Yap</button>
                        </div>
                    `;
                }
            } else {
                localStorage.removeItem('token'); // Invalid token
            }
        } catch (e) {
            console.error('User info load error:', e);
        }
    } else {
        // Not logged in (Default state is already static HTML, but ensure correctness)
    }
}

function toggleUserDropdown() {
    const menu = document.getElementById('user-dropdown-menu');
    if (menu) menu.classList.toggle('active');
}

function logout() {
    localStorage.removeItem('token');
    showToast('Çıkış yapıldı', 'success');
    setTimeout(() => window.location.reload(), 1000);
}

// --- Mobile Menu ---
function setupMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobileMenu');
    const closeBtn = document.getElementById('mobile-menu-close');

    if (btn && menu) {
        btn.onclick = () => menu.classList.add('active');
    }
    if (closeBtn && menu) {
        closeBtn.onclick = () => menu.classList.remove('active');
    }
}

// --- Active Nav Link ---
function updateActiveNavLink() {
    const links = document.querySelectorAll('.nav-links a');
    const path = window.location.pathname;

    links.forEach(link => {
        if (link.getAttribute('href') === path) {
            link.classList.add('active');
        }
    });
}


// --- GOOGLE BANNER KILLER ---
function hideGoogleBanner() {
    // 1. Remove the Banner Frame completely
    const startBanner = document.querySelector('.goog-te-banner-frame');
    if (startBanner) {
        startBanner.remove(); // DELETE IT
    }

    // 2. Also check specifically for iframes that might be the banner
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
        // Log found iframes for debugging
        // console.log("Checking iframe:", iframe.id, iframe.className, iframe.parentElement);

        if (iframe.className.includes('goog-te-banner-frame') ||
            iframe.id === 'goog-te-banner-frame' ||
            (iframe.src && iframe.src.includes('google.com/translate')) ||
            // AGGRESSIVE: If it's fixed at top and has no ID/Class, it might be it
            (getComputedStyle(iframe).position === 'fixed' && getComputedStyle(iframe).top === '0px')
        ) {
            console.log("Hiding (NOT Killing) Google Banner Iframe:", iframe);
            // DO NOT REMOVE! Removing it kills the translation engine.
            // Just hide it visibly.
            iframe.style.display = 'none';
            iframe.style.visibility = 'hidden';
            iframe.style.height = '0px';
            iframe.style.width = '0px';
            iframe.style.opacity = '0';
            iframe.style.pointerEvents = 'none';
            iframe.style.zIndex = '-1000';
        }
    });

    // 3. Force Body Reset
    if (document.body.style.top !== '0px' || document.body.style.marginTop !== '0px') {
        document.body.style.top = '0px';
        document.body.style.marginTop = '0px';
        document.body.classList.remove('translated-ltr'); // Remove Google class
    }

    // 4. Hide Gadget Icon
    const icon = document.querySelector('.goog-te-gadget-icon');
    if (icon) icon.style.display = 'none';

    // 5. Hide Tooltip
    const tooltip = document.querySelector('.goog-tooltip');
    if (tooltip) tooltip.style.display = 'none';
}
// Run extremely aggressively at start, then periodically
setInterval(hideGoogleBanner, 100);


// --- Language Switcher (Robust / "Nuclear" Version) ---
function initLanguageSwitcher() {
    // 0. INJECT GOOGLE TRANSLATE SCRIPT IF MISSING
    if (!document.getElementById('google-translate-script')) {
        const script = document.createElement('script');
        script.id = 'google-translate-script';
        script.type = 'text/javascript';
        script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
        document.head.appendChild(script);

        // Add hidden target element
        if (!document.getElementById('google_translate_element')) {
            const div = document.createElement('div');
            div.id = 'google_translate_element';
            div.style.display = 'none';
            document.body.appendChild(div);
        }

        // Init Callback
        window.googleTranslateElementInit = function () {
            new google.translate.TranslateElement({
                pageLanguage: 'tr',
                includedLanguages: 'en,tr',
                layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
                autoDisplay: false
            }, 'google_translate_element');
        };
    }

    const enforceLanguageButtons = () => {
        try {
            // --- COOKIE HELPERS ---
            function getCookie(name) {
                const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
                return v ? v[2] : null;
            }
            function setCookie(name, value) {
                const domain = window.location.hostname;
                document.cookie = `${name}=${value}; path=/`;
                document.cookie = `${name}=${value}; path=/; domain=${domain}`;
                document.cookie = `${name}=${value}; path=/; domain=.${domain}`;
            }
            function deleteCookie(name) {
                const domain = window.location.hostname;
                document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
                document.cookie = `${name}=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
                document.cookie = `${name}=; path=/; domain=.${domain}; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
            }

            // --- STATE ---
            const currentTrans = getCookie('googtrans');
            const isEnglish = currentTrans === '/tr/en';

            // --- SVG FLAGS ---
            const trFlag = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 32 32" style="border-radius: 50%; display: block;"><rect x="1" y="4" width="30" height="24" rx="4" ry="4" fill="#e30a17"/><circle cx="13" cy="16" r="6" fill="#fff"/><circle cx="14.5" cy="16" r="5" fill="#e30a17"/><path d="M19 16 L20.5 14.5 L20.5 17.5 Z" fill="#fff" stroke="#fff" stroke-width="2"/></svg>`;
            const enFlag = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 32 32" style="border-radius: 50%; display: block;"><rect x="1" y="4" width="30" height="24" rx="4" ry="4" fill="#00247d"/><path d="M1 4 L31 28 M31 4 L1 28" stroke="#fff" stroke-width="6"/><path d="M16 4 L16 28 M1 16 L31 16" stroke="#fff" stroke-width="10"/><path d="M1 4 L31 28 M31 4 L1 28" stroke="#cf142b" stroke-width="3"/><path d="M16 4 L16 28 M1 16 L31 16" stroke="#cf142b" stroke-width="6"/></svg>`;

            const labelContent = isEnglish
                ? `<div style="display:flex; align-items:center; gap:6px;">${trFlag} <span style="font-weight:700;">TR</span></div>`
                : `<div style="display:flex; align-items:center; gap:6px;">${enFlag} <span style="font-weight:700;">EN</span></div>`;

            // --- HANDLER --- 
            const handleLangClick = (e, btnElement) => {
                e.preventDefault();
                e.stopPropagation();

                if (btnElement) {
                    btnElement.style.transform = 'scale(0.95)';
                    setTimeout(() => btnElement.style.transform = 'scale(1)', 100);
                    btnElement.style.opacity = '0.7';
                }

                // NUCLEAR CLEAR
                deleteCookie('googtrans');
                document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname;
                document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.aperionx.com";
                document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=aperionx.com";

                if (isEnglish) {
                    // Switch to Turkish
                    document.cookie = "googtrans=/tr/tr; path=/";
                    document.cookie = "googtrans=/tr/tr; path=/; domain=" + window.location.hostname;
                    document.cookie = "googtrans=/tr/tr; path=/; domain=.aperionx.com";
                } else {
                    // Switch to English
                    document.cookie = "googtrans=/tr/en; path=/";
                    document.cookie = "googtrans=/tr/en; path=/; domain=" + window.location.hostname;
                    document.cookie = "googtrans=/tr/en; path=/; domain=.aperionx.com";
                }

                console.log("Language Switched. Reloading...");
                setTimeout(() => window.location.reload(), 200);
            };

            // --- 1. MOBILE MENU BUTTON ---
            const mobileMenu = document.querySelector('.mobile-menu');
            if (mobileMenu) {
                let mobileBtn = document.getElementById('nuclear-mobile-btn');
                // Ensure it exists and is inside the menu
                if (!mobileBtn || mobileBtn.parentNode !== mobileMenu) {
                    if (mobileBtn) mobileBtn.remove();
                    mobileBtn = document.createElement('a');
                    mobileBtn.id = 'nuclear-mobile-btn';
                    mobileBtn.href = "#";
                    mobileBtn.setAttribute('role', 'button');
                    // Static Styles
                    mobileBtn.style.cssText = `
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 8px !important;
                        padding: 12px 25px !important;
                        border-radius: 50px !important;
                        background-color: rgba(255,255,255,0.1) !important;
                        border: 1px solid rgba(255,255,255,0.2) !important;
                        color: var(--text-color, #fff) !important;
                        font-family: sans-serif !important;
                        font-weight: bold !important;
                        font-size: 14px !important;
                        margin-bottom: 15px !important;
                        width: auto !important;
                        max-width: 200px !important;
                        cursor: pointer !important;
                        transition: transform 0.1s !important;
                    `;

                    // --- POSITIONING FIX ---
                    // Want it explicitly at the bottom, after auth buttons
                    const authSection = mobileMenu.querySelector('.mobile-auth');

                    if (authSection) {
                        // Insert AFTER auth section
                        if (mobileBtn.parentNode !== mobileMenu || mobileBtn.previousElementSibling !== authSection) {
                            // Check if already after
                            if (authSection.nextSibling !== mobileBtn) {
                                authSection.parentNode.insertBefore(mobileBtn, authSection.nextSibling);
                            }
                        }
                    } else {
                        // Fallback: Append to end
                        mobileMenu.appendChild(mobileBtn);
                    }

                    mobileBtn.style.marginTop = '15px'; // Force separation
                    mobileBtn.onclick = (e) => handleLangClick(e, mobileBtn);
                }
                // Update Content
                if (!mobileBtn.innerHTML.includes('svg')) {
                    mobileBtn.innerHTML = labelContent;
                }
            }

            // --- 2. DESKTOP BUTTON ---
            let desktopBtn = document.getElementById('lang-switch-btn');
            if (desktopBtn) {
                // Enforce Styles
                desktopBtn.style.width = 'auto';
                desktopBtn.style.height = '36px';
                desktopBtn.style.padding = '0 12px';
                desktopBtn.style.borderRadius = '20px';
                desktopBtn.style.display = 'flex';
                desktopBtn.style.alignItems = 'center';
                desktopBtn.style.justifyContent = 'center';
                desktopBtn.style.gap = '6px';
                desktopBtn.style.fontSize = '14px';

                // Enforce Content
                if (!desktopBtn.innerHTML.includes('svg')) {
                    desktopBtn.innerHTML = labelContent;
                }

                // Attach Click
                if (!desktopBtn.dataset.hasNuclearClick) {
                    const newDesktopBtn = desktopBtn.cloneNode(true);
                    desktopBtn.parentNode.replaceChild(newDesktopBtn, desktopBtn);
                    newDesktopBtn.dataset.hasNuclearClick = "true";
                    newDesktopBtn.onclick = (e) => handleLangClick(e, newDesktopBtn);
                    desktopBtn = newDesktopBtn;
                }
            }

        } catch (e) {
            console.error("Lang Enforce Error", e);
        }
    };

    // Run Logic
    enforceLanguageButtons();
    // Run periodically to handle dynamic content/late loads
    setInterval(enforceLanguageButtons, 1000);
}


const express = require('express');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });



const logFile = 'server_debug.log';

function logDebug(msg) {
    const time = new Date().toISOString();
    fs.appendFileSync(logFile, `[${time}] ${msg}\n`);
}

logDebug(`CWD: ${process.cwd()}`);
logDebug(`NODE_ENV: ${process.env.NODE_ENV}`);


const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const cors = require('cors');
const compression = require('compression');
const multer = require('multer');
const sharp = require('sharp');
const jwt = require('jsonwebtoken');
const DOMPurify = require('isomorphic-dompurify');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');


const app = express();
app.set('trust proxy', 1); // Trust first proxy (Nginx/CloudPanel)
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'gizli_anahtar';
const cookieParser = require('cookie-parser'); // Import cookie-parser


app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5000,
    message: 'Too many requests from this IP, please try again later.'
});
app.disable('x-powered-by');
app.use(cors());
app.use(compression());
app.use(bodyParser.json({ limit: '100mb' }));
app.use(cookieParser());
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url} - IP: ${req.ip}`);
    next();
});


app.use(async (req, res, next) => {
    // 1. Check for bypass cookie
    if (req.cookies.maintenance_bypass) {
        return next();
    }

    // 2. Allow whitelisted paths (static assets, login API for bypass, etc.)
    const whitelist = [
        '/maintenance.html',
        '/maintenance-access',
        '/api/settings', // Needed for countdown
        '/uploads',
        '/robots.txt',   // SEO
        '/sitemap.xml',  // SEO
        '/feed.xml',     // RSS Feed
        '/admin.html',   // Allow Admin access (still protected by login)
        '/admin',        // Allow Admin clean URL
        '/editor.html',  // Allow Editor access
        '/editor',       // Allow Editor clean URL
        '/author.html',  // Allow Author access
        '/author',       // Allow Author clean URL
        '/author_v2',    // Allow Debug Author access
        '/index.html',   // Allow Login on index
        '/api/login',    // Allow login API
        '/api/register', // Allow register API
    ];

    // Check if path starts with whitelist item
    if (whitelist.some(path => req.path.startsWith(path))) {
        return next();
    }

    // 3. Check DB setting
    try {
        const [rows] = await pool.query("SELECT setting_value FROM settings WHERE setting_key = 'maintenance_mode'");
        if (rows.length > 0 && rows[0].setting_value === 'true') {
            // Maintenance Active -> Block
            if (req.accepts('html')) {
                const maintenanceFile = path.resolve(__dirname, 'maintenance.html');
                fs.readFile(maintenanceFile, 'utf8', (err, data) => {
                    if (err) {
                        console.error('Error reading maintenance file:', err);
                        return res.status(503).send('Site Bakımda (Hata: Dosya Okunamadı)');
                    }
                    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
                    res.status(503).send(data);
                });
                return; // Stop execution to prevent calling next()
            } else {
                return res.status(503).json({ message: 'Site is under maintenance.' });
            }
        }
    } catch (e) {
        console.error('Maintenance Check Error:', e);
    }

    next();
});


// 301 Redirect for .html extensions
app.use((req, res, next) => {
    if (req.path.endsWith('.html')) {
        const newPath = req.path.slice(0, -5);
        const query = req.url.slice(req.path.length);
        return res.redirect(301, newPath + query);
    }
    next();
});

// === MAGIC LINK ROUTE ===
app.get('/maintenance-access', async (req, res) => {
    const { key } = req.query;
    if (!key) return res.status(400).send('Anahtar gerekli.');

    try {
        const [rows] = await pool.query("SELECT setting_value FROM site_settings WHERE setting_key = 'maintenance_secret'");
        if (rows.length === 0) return res.status(500).send('Sistem hatası.');

        const secret = rows[0].setting_value;
        if (key === secret) {
            // Valid Key -> Set Cookie (30 days)
            res.cookie('maintenance_bypass', 'true', {
                maxAge: 30 * 24 * 60 * 60 * 1000,
                httpOnly: true
            });
            res.redirect('/');
        } else {
            res.status(403).send('Geçersiz anahtar.');
        }
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

// === ROOT REDIRECT ===
// Redirect direct /index.html access to root
app.get('/index.html', (req, res) => {
    res.redirect(301, '/');
});

// === SEO & SLUG HELPERS ===
// Serve index.html for /en root
app.get(['/en', '/en/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Serve static HTML pages on /en path
app.get('/en/:page', (req, res, next) => {
    const page = req.params.page;
    if (page.endsWith('.html')) {
        const filePath = path.join(__dirname, 'views', page);
        if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
        }
    }
    next();
});

function slugify(text) {
    if (!text) return '';
    const trMap = {
        'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ş': 's', 'Ş': 's',
        'ü': 'u', 'Ü': 'u', 'ı': 'i', 'İ': 'i', 'ö': 'o', 'Ö': 'o'
    };
    return text.toString()
        .split('')
        .map(c => trMap[c] || c)
        .join('')
        .toLowerCase()
        .replace(/\s+/g, '-')     // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-')   // Replace multiple - with single -
        .replace(/^-+/, '')       // Trim - from start
        .replace(/-+$/, '');      // Trim - from end
}

async function getUniqueSlug(pool, title, excludeId = null, table = 'articles') {
    let slug = slugify(title);
    let originalSlug = slug;
    let counter = 1;
    let exists = true;
    while (exists) {
        let query = `SELECT id FROM ${table} WHERE slug = ?`;
        let params = [slug];
        if (excludeId) {
            query += " AND id != ?";
            params.push(excludeId);
        }
        const [rows] = await pool.query(query, params);
        if (rows.length === 0) {
            exists = false;
        } else {
            slug = `${originalSlug}-${counter}`;
            counter++;
        }
    }
    return slug;
}

async function getArticleAuthors(pool, articleId) {
    try {
        const [rows] = await pool.query(`
            SELECT u.id, u.fullname, u.username, u.avatar_url, u.bio, u.job_title 
            FROM article_authors aa
            JOIN users u ON aa.user_id = u.id
            WHERE aa.article_id = ?
            ORDER BY aa.order_index ASC, aa.created_at ASC
        `, [articleId]);

        // Fallback: if no authors in join table, check articles.author_id
        if (rows.length === 0) {
            const [art] = await pool.query('SELECT author_id FROM articles WHERE id = ?', [articleId]);
            if (art.length > 0 && art[0].author_id) {
                const [u] = await pool.query('SELECT id, fullname, username, avatar_url, bio, job_title FROM users WHERE id = ?', [art[0].author_id]);
                return u;
            }
        }
        return rows;
    } catch (e) {
        console.error('getArticleAuthors Error:', e);
        return [];
    }
}

async function getExperimentAuthors(pool, experimentId) {
    try {
        const [rows] = await pool.query(`
            SELECT u.id, u.fullname, u.username, u.avatar_url, u.bio, u.job_title 
            FROM experiment_authors ea
            JOIN users u ON ea.user_id = u.id
            WHERE ea.experiment_id = ?
            ORDER BY ea.order_index ASC, ea.created_at ASC
        `, [experimentId]);

        // Fallback: if no authors in join table, check experiments.author_id
        if (rows.length === 0) {
            const [exp] = await pool.query('SELECT author_id FROM experiments WHERE id = ?', [experimentId]);
            if (exp.length > 0 && exp[0].author_id) {
                const [u] = await pool.query('SELECT id, fullname, username, avatar_url, bio, job_title FROM users WHERE id = ?', [exp[0].author_id]);
                return u;
            }
        }
        return rows;
    } catch (e) {
        console.error('getExperimentAuthors Error:', e);
        return [];
    }
}

async function getExperimentAuthors(pool, experimentId) {
    try {
        const [rows] = await pool.query(`
            SELECT u.id, u.fullname, u.username, u.avatar_url, u.bio, u.job_title 
            FROM experiment_authors ea
            JOIN users u ON ea.user_id = u.id
            WHERE ea.experiment_id = ?
            ORDER BY ea.order_index ASC, ea.created_at ASC
        `, [experimentId]);

        // Fallback: if no authors in join table, check experiments.author_id
        if (rows.length === 0) {
            const [exp] = await pool.query('SELECT author_id FROM experiments WHERE id = ?', [experimentId]);
            if (exp.length > 0 && exp[0].author_id) {
                const [u] = await pool.query('SELECT id, fullname, username, avatar_url, bio, job_title FROM users WHERE id = ?', [exp[0].author_id]);
                return u;
            }
        }
        return rows;
    } catch (e) {
        console.error('getExperimentAuthors Error:', e);
        return [];
    }
}


// (Experiment helper functions removed)

// === DYNAMIC SEO ROUTES (SSR) ===

// 1. Slug Route (Canonical)
app.get(['/makale/:slug', '/article/:slug', '/en/makale/:slug', '/en/article/:slug'], async (req, res, next) => {
    const slug = req.params.slug;

    // EDGE CASE FIX: Redirect incorrect /makale/articles.html links -> /articles.html
    if (slug === 'articles.html' || slug === 'article-detail.html') {
        return res.redirect(301, '/articles.html');
    }
    try {
        // Fetch article by slug
        const [rows] = await pool.query('SELECT * FROM articles WHERE slug = ?', [slug]);

        if (rows.length === 0) {
            return res.status(404).send('Makale bulunamadı (404)');
        }

        const article = rows[0];

        // ============ VIEW COUNTING LOGIC ============
        const articleId = article.id;
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

        console.log(`[VIEW-COUNT] Article ${articleId} (${slug}) accessed from IP: ${ip}`);

        try {
            // Only throttle same IP + same article within 2 hours
            const [viewCheck] = await pool.query(
                `SELECT id FROM article_views 
                 WHERE article_id = ? AND ip_address = ? AND viewed_at > DATE_SUB(NOW(), INTERVAL 2 HOUR)`,
                [articleId, ip]
            );

            if (viewCheck.length === 0) {
                console.log(`[VIEW-COUNT] ✅ New view for Article ${articleId} from IP ${ip}`);
                await pool.query('INSERT INTO article_views (article_id, ip_address) VALUES (?, ?)', [articleId, ip]);
                await pool.query('UPDATE articles SET views = views + 1 WHERE id = ?', [articleId]);
            } else {
                console.log(`[VIEW-COUNT] ⏳ Throttled for Article ${articleId} from IP ${ip} (already viewed in last 24h)`);
            }
        } catch (vcErr) {
            console.error('[VIEW-COUNT] Error:', vcErr.message);
        }
        // ============ END VIEW COUNTING ============

        // Read Template
        const filePath = path.join(__dirname, 'views', 'article-detail.html');
        fs.readFile(filePath, 'utf8', async (err, htmlData) => {
            if (err) return next(err);

            try {
                // Use String Replacement instead of JSDOM to avoid dependency issues on server
                const origin = `${req.protocol}://${req.get('host')}`;

                // Get Authors
                let authorNames = [];
                let authors = [];
                try {
                    authors = await getArticleAuthors(pool, article.id);
                    if (authors.length > 0) {
                        authorNames = authors.map(a => a.fullname);
                    } else {
                        authorNames = ['AperionX Yazarı'];
                    }
                } catch (e) { authorNames = ['AperionX Yazarı']; }

                const authorName = authorNames.join(', ');

                // Prepare Content
                const title = article.title;
                const summary = article.excerpt || article.title;
                const img = article.image_url
                    ? (article.image_url.startsWith('http') ? article.image_url : `${origin}/${article.image_url}`)
                    : `${origin}/uploads/logo.png`;

                // Determine current URL structure
                const isEnglish = req.path.startsWith('/en/');
                const urlPrefix = isEnglish ? `${origin}/en` : origin;
                const url = `${urlPrefix}/makale/${article.slug}`;

                // Fix: Sanitize potential nulls
                const safeTitle = (title || '').replace(/"/g, '&quot;');
                const safeSummary = (summary || '').replace(/"/g, '&quot;');
                const safeImg = (img || '').replace(/"/g, '&quot;');
                const safeUrl = (url || '').replace(/"/g, '&quot;');

                // Format Date for Schema
                const isoDate = new Date(article.created_at).toISOString();

                // REPLACEMENT LOGIC
                let html = htmlData;

                // Title
                html = html.replace(/<title>.*?<\/title>/i, `<title>${safeTitle} - AperionX</title>`);

                // Meta Tags (Regex replace)
                const replaceMeta = (name, content) => {
                    const regex = new RegExp(`(<meta\\s+(?:name|property)="${name}"\\s+content=")([^"]*)(")`, 'gi');
                    html = html.replace(regex, `$1${content}$3`);
                };

                replaceMeta('description', safeSummary);
                replaceMeta('og:title', safeTitle);
                replaceMeta('og:description', safeSummary);
                replaceMeta('og:image', safeImg);
                replaceMeta('og:url', safeUrl);

                // Add Article Published Date Meta
                if (!html.includes('article:published_time')) {
                    html = html.replace('</head>', `<meta property="article:published_time" content="${isoDate}">\n</head>`);
                }

                // Add Dynamic Keywords
                const tags = article.tags || 'bilim, teknoloji, makale, aperionx';
                html = html.replace(/<meta name="keywords" content=".*?">/i, `<meta name="keywords" content="${tags}, aperion, aperionx, makale">`);
                if (!html.includes('<meta name="keywords"')) {
                    html = html.replace('</head>', `<meta name="keywords" content="${tags}, aperion, aperionx, makale">\n</head>`);
                }


                replaceMeta('twitter:title', safeTitle);
                replaceMeta('twitter:description', safeSummary);
                replaceMeta('twitter:image', safeImg);

                // Canonical Replacement
                html = html.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${origin}/makale/${slug}" />\n    <link rel="alternate" hreflang="tr" href="${origin}/makale/${slug}">\n    <link rel="alternate" hreflang="en" href="${origin}/en/makale/${slug}">\n    <link rel="alternate" hreflang="x-default" href="${origin}/makale/${slug}">`);

                // Inject Preloaded Data Script
                const scriptTag = `<script>window.SERVER_ARTICLE = ${JSON.stringify(article)}; window.SERVER_AUTHORS = ${JSON.stringify(authors)};</script>`;

                // === JSON-LD STRUCTURED DATA INJECTION ===
                const schemaData = {
                    "@context": "https://schema.org",
                    "@type": "Article",
                    "mainEntityOfPage": {
                        "@type": "WebPage",
                        "@id": safeUrl
                    },
                    "headline": safeTitle,
                    "image": [safeImg],
                    "datePublished": isoDate,
                    "dateModified": isoDate, // Should ideally be updated_at if available
                    "author": {
                        "@type": "Person",
                        "name": authorName,
                        "url": authors.length > 0 ? `${origin}/author.html?username=${authors[0].username}` : `${origin}/author.html`
                    },
                    "publisher": {
                        "@type": "Organization",
                        "name": "AperionX",
                        "logo": {
                            "@type": "ImageObject",
                            "url": `${origin}/uploads/logo.png`
                        }
                    },
                    "description": safeSummary
                };

                const breadcrumbData = {
                    "@context": "https://schema.org",
                    "@type": "BreadcrumbList",
                    "itemListElement": [{
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Ana Sayfa",
                        "item": "https://aperionx.com"
                    }, {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Makaleler",
                        "item": "https://aperionx.com/articles.html"
                    }, {
                        "@type": "ListItem",
                        "position": 3,
                        "name": safeTitle,
                        "item": safeUrl
                    }]
                };

                const jsonLdScript = `<script type="application/ld+json">${JSON.stringify(schemaData)}</script>`;
                const breadcrumbScript = `<script type="application/ld+json">${JSON.stringify(breadcrumbData)}</script>`;

                // Insert all scripts
                html = html.replace('</head>', `${scriptTag}\n${jsonLdScript}\n${breadcrumbScript}\n</head>`);

                // SSR: Render Author Name & Avatar directly
                // Pattern match existing placeholder: <span id="detail-author"><i class="ph ph-user"></i> Admin</span>

                let authorHtml = authors.map(a => `<a href="/author.html?username=${a.username}" style="margin-right: 10px; text-decoration: none; color: inherit;"><i class="ph ph-user"></i> ${a.fullname}</a>`).join('');

                // Regex update: The HTML is <span id="detail-author">...</span> without class="meta-item"
                // Using a more flexible regex to catch attributes in any order if they exist, but specifically id="detail-author"
                html = html.replace(/<span\s+id="detail-author">.*?<\/span>/s, `<span id="detail-author">${authorHtml}</span>`);

                // Fallback: If strict match fails, try sloppy match (in case of double quotes vs single etc) or just exact string from file
                // But the regex <span\s+id="detail-author"> should match <span id="detail-author">


                res.send(html);

            } catch (parseErr) {
                console.error('SSR Parse Error:', parseErr);
                res.status(500).send(parseErr.toString());
            }
        });


    } catch (e) {
        console.error('DB Error:', e);
        next();
    }
});


// === TRUE PREVIEW ROUTE FOR EDITORS ===
app.get('/preview-article/:id', async (req, res, next) => {
    // Authenticate via query param token for iframes
    const token = req.query.token;
    if (!token) return res.status(401).send('Yetkisiz Erişim (Token Yok)');

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
    } catch (e) {
        return res.status(403).send('Yetkisiz Erişim (Geçersiz Token)');
    }

    const id = req.params.id;

    try {
        const [rows] = await pool.query('SELECT * FROM articles WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).send('Makale bulunamadı (404)');
        
        const article = rows[0];

        // Verify authorization
        if (req.user.role !== 'admin' && req.user.role !== 'editor' && article.author_id !== req.user.id) {
            return res.status(403).send('Erişim Reddedildi');
        }

        // Read Template
        const filePath = path.join(__dirname, 'views', 'article-detail.html');
        fs.readFile(filePath, 'utf8', async (err, htmlData) => {
            if (err) return next(err);

            try {
                const origin = `${req.protocol}://${req.get('host')}`;

                let authorNames = [];
                let authors = [];
                try {
                    authors = await getArticleAuthors(pool, article.id);
                    if (authors.length > 0) {
                        authorNames = authors.map(a => a.fullname);
                    } else {
                        authorNames = ['AperionX Yazarı'];
                    }
                } catch (e) { authorNames = ['AperionX Yazarı']; }

                const authorName = authorNames.join(', ');

                const title = article.title;
                const summary = article.excerpt || article.title;
                const img = article.image_url
                    ? (article.image_url.startsWith('http') ? article.image_url : `${origin}/${article.image_url}`)
                    : `${origin}/uploads/logo.png`;

                const safeTitle = (title || '').replace(/"/g, '&quot;');
                const safeSummary = (summary || '').replace(/"/g, '&quot;');
                const safeImg = (img || '').replace(/"/g, '&quot;');
                const safeUrl = `${origin}/makale/${article.slug}`;
                const isoDate = new Date(article.created_at).toISOString();

                let html = htmlData;

                html = html.replace(/<title>.*?<\/title>/i, `<title>(ÖNİZLEME) ${safeTitle} - AperionX</title>`);

                const replaceMeta = (name, content) => {
                    const regex = new RegExp(`(<meta\\s+(?:name|property)="${name}"\\s+content=")([^"]*)(")`, 'gi');
                    html = html.replace(regex, `$1${content}$3`);
                };

                replaceMeta('description', safeSummary);
                replaceMeta('og:title', safeTitle);
                replaceMeta('og:description', safeSummary);
                replaceMeta('og:image', safeImg);

                // Inject Preloaded Data Script WITH IS_PREVIEW FLAG
                const scriptTag = `<script>window.SERVER_ARTICLE = ${JSON.stringify(article)}; window.SERVER_AUTHORS = ${JSON.stringify(authors)}; window.IS_PREVIEW = true;</script>`;

                html = html.replace('</head>', `${scriptTag}\n</head>`);

                let authorHtml = authors.map(a => `<a href="#" style="margin-right: 10px; text-decoration: none; color: inherit;"><i class="ph ph-user"></i> ${a.fullname}</a>`).join('');
                html = html.replace(/<span\s+id="detail-author">.*?<\/span>/s, `<span id="detail-author">${authorHtml}</span>`);

                res.send(html);

            } catch (parseErr) {
                console.error('SSR Parse Error (Preview):', parseErr);
                res.status(500).send(parseErr.toString());
            }
        });

    } catch (e) {
        console.error('DB Error (Preview):', e);
        res.status(500).send('Sunucu Hatası');
    }
});
// === EXPERIMENT ROUTES (SSR) ===
app.get(['/deney/:slug', '/experiment/:slug', '/en/deney/:slug', '/en/experiment/:slug'], async (req, res, next) => {
    const slug = req.params.slug;

    if (slug === 'experiments.html' || slug === 'experiment-detail.html') {
        return res.redirect(301, '/experiments.html');
    }
    try {
        // Fetch experiment by slug
        const [rows] = await pool.query("SELECT * FROM experiments WHERE slug = ? AND status = 'published' AND deleted_at IS NULL", [slug]);

        if (rows.length === 0) {
            return res.status(404).send('Deney bulunamadı (404)');
        }

        const experiment = rows[0];

        // ============ VIEW COUNTING LOGIC ============
        const experimentId = experiment.id;
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

        console.log(`[VIEW-COUNT] Experiment ${experimentId} (${slug}) accessed from IP: ${ip}`);

        try {
            // Only throttle same IP + same experiment within 2 hours
            const [viewCheck] = await pool.query(
                `SELECT id FROM experiment_views 
                 WHERE experiment_id = ? AND ip_address = ? AND viewed_at > DATE_SUB(NOW(), INTERVAL 2 HOUR)`,
                [experimentId, ip]
            );

            if (viewCheck.length === 0) {
                console.log(`[VIEW-COUNT] ✅ New view for Experiment ${experimentId} from IP ${ip}`);
                await pool.query('INSERT INTO experiment_views (experiment_id, ip_address) VALUES (?, ?)', [experimentId, ip]);
                await pool.query('UPDATE experiments SET views = views + 1 WHERE id = ?', [experimentId]);
                experiment.views = (experiment.views || 0) + 1;
            } else {
                console.log(`[VIEW-COUNT] ⏳ Throttled for Experiment ${experimentId} from IP ${ip}`);
            }
        } catch (vcErr) {
            console.error('[VIEW-COUNT] Error:', vcErr.message);
        }
        // ============ END VIEW COUNTING ============

        // Read Template
        const filePath = path.join(__dirname, 'views', 'experiment-detail.html');
        fs.readFile(filePath, 'utf8', async (err, htmlData) => {
            if (err) return next(err);

            try {
                const origin = `${req.protocol}://${req.get('host')}`;

                // Get Authors
                let authorNames = [];
                let authors = [];
                try {
                    authors = await getExperimentAuthors(pool, experiment.id);
                    if (authors.length > 0) {
                        authorNames = authors.map(a => a.fullname);
                    } else {
                        authorNames = ['AperionX Yazarı'];
                    }
                } catch (e) { authorNames = ['AperionX Yazarı']; }

                const authorName = authorNames.join(', ');

                // Prepare Content
                const title = experiment.title;
                const summary = experiment.excerpt || experiment.title;
                const img = experiment.image_url
                    ? (experiment.image_url.startsWith('http') ? experiment.image_url : `${origin}/${experiment.image_url}`)
                    : `${origin}/uploads/logo.png`;

                // Determine current URL structure
                const isEnglish = req.path.startsWith('/en/');
                const urlPrefix = isEnglish ? `${origin}/en` : origin;
                const url = `${urlPrefix}/deney/${experiment.slug}`;

                const safeTitle = (title || '').replace(/"/g, '&quot;');
                const safeSummary = (summary || '').replace(/"/g, '&quot;');
                const safeImg = (img || '').replace(/"/g, '&quot;');
                const safeUrl = (url || '').replace(/"/g, '&quot;');

                // Format Date for Schema
                const isoDate = new Date(experiment.created_at).toISOString();

                // REPLACEMENT LOGIC
                let html = htmlData;

                // Title
                html = html.replace(/<title>.*?<\/title>/i, `<title>${safeTitle} - AperionX Deneyler</title>`);

                // Meta Tags (Regex replace)
                const replaceMeta = (name, content) => {
                    const regex = new RegExp(`(<meta\\s+(?:name|property)="${name}"\\s+content=")([^"]*)(")`, 'gi');
                    html = html.replace(regex, `$1${content}$3`);
                };

                replaceMeta('description', safeSummary);
                replaceMeta('og:title', safeTitle);
                replaceMeta('og:description', safeSummary);
                replaceMeta('og:image', safeImg);
                replaceMeta('og:url', safeUrl);

                // Add Experiment Published Date Meta
                if (!html.includes('article:published_time')) {
                    html = html.replace('</head>', `<meta property="article:published_time" content="${isoDate}">\n</head>`);
                }

                // Add Dynamic Keywords
                const tags = experiment.tags || 'bilimsel deney, fen deneyleri, laboratuvar, bilim, aperionx';
                html = html.replace(/<meta name="keywords" content=".*?">/i, `<meta name="keywords" content="${tags}, aperion, aperionx, deney">`);
                if (!html.includes('<meta name="keywords"')) {
                    html = html.replace('</head>', `<meta name="keywords" content="${tags}, aperion, aperionx, deney">\n</head>`);
                }

                replaceMeta('twitter:title', safeTitle);
                replaceMeta('twitter:description', safeSummary);
                replaceMeta('twitter:image', safeImg);

                // Canonical Replacement
                html = html.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${origin}/deney/${slug}" />\n    <link rel="alternate" hreflang="tr" href="${origin}/deney/${slug}">\n    <link rel="alternate" hreflang="en" href="${origin}/en/deney/${slug}">\n    <link rel="alternate" hreflang="x-default" href="${origin}/deney/${slug}">`);

                // Inject Preloaded Data Script
                const scriptTag = `<script>window.SERVER_EXPERIMENT = ${JSON.stringify(experiment)}; window.SERVER_EXP_AUTHORS = ${JSON.stringify(authors)};</script>`;

                // === JSON-LD STRUCTURED DATA INJECTION ===
                const schemaData = {
                    "@context": "https://schema.org",
                    "@type": "ScholarlyArticle",
                    "mainEntityOfPage": {
                        "@type": "WebPage",
                        "@id": safeUrl
                    },
                    "headline": safeTitle,
                    "image": [safeImg],
                    "datePublished": isoDate,
                    "dateModified": isoDate,
                    "author": {
                        "@type": "Person",
                        "name": authorName,
                        "url": authors.length > 0 ? `${origin}/author-profile.html?u=${authors[0].id}` : `${origin}/author-profile.html`
                    },
                    "publisher": {
                        "@type": "Organization",
                        "name": "AperionX",
                        "logo": {
                            "@type": "ImageObject",
                            "url": `${origin}/uploads/logo.png`
                        }
                    },
                    "description": safeSummary
                };

                const breadcrumbData = {
                    "@context": "https://schema.org",
                    "@type": "BreadcrumbList",
                    "itemListElement": [{
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Ana Sayfa",
                        "item": "https://aperionx.com"
                    }, {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Deneyler",
                        "item": "https://aperionx.com/experiments.html"
                    }, {
                        "@type": "ListItem",
                        "position": 3,
                        "name": safeTitle,
                        "item": safeUrl
                    }]
                };

                const jsonLdScript = `<script type="application/ld+json">${JSON.stringify(schemaData)}</script>`;
                const jsonLdBreadcrumb = `<script type="application/ld+json">${JSON.stringify(breadcrumbData)}</script>`;

                // Inject scripts right before </head>
                html = html.replace('</head>', `${scriptTag}\n${jsonLdScript}\n${jsonLdBreadcrumb}\n</head>`);

                // Send the generated HTML
                res.send(html);

            } catch (innerErr) {
                console.error('SSR processing error for /deney/:slug', innerErr);
                res.send(htmlData);
            }
        });

    } catch (e) {
        console.error('Database error in /deney/:slug', e);
        res.status(500).send('Sunucu Hatası');
    }
});

app.get('/experiment-detail.html', async (req, res) => {
    const id = req.query.id;
    if (id && /^\d+$/.test(id)) {
        try {
            const [rows] = await pool.query('SELECT slug FROM experiments WHERE id = ?', [id]);
            if (rows.length > 0 && rows[0].slug) {
                return res.redirect(301, `/deney/${rows[0].slug}`);
            }
        } catch (e) {
            console.error('Error finding experiment slug for redirect:', e);
        }
    }
    res.redirect(301, '/experiments.html');
});

// Redirect removed so views/experiments.html can be served

// === RSS FEED ===
app.get('/feed.xml', async (req, res) => {
    try {
        const [articles] = await pool.query(
            "SELECT id, title, slug, excerpt, image_url, category, tags, created_at, author_id FROM articles WHERE status = 'published' ORDER BY created_at DESC LIMIT 30"
        );
        const origin = `${req.protocol}://${req.get('host')}`;

        let xml = '<?xml version="1.0" encoding="UTF-8"?>';
        xml += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">';
        xml += '<channel>';
        xml += '<title>AperionX - Bilim ve Teknoloji</title>';
        xml += `<link>${origin}</link>`;
        xml += '<description>Bilimin sınırlarını keşfedin. Geleceği şekillendiren teknoloji analizleri ve derinlemesine makaleler.</description>';
        xml += '<language>tr</language>';
        xml += `<atom:link href="${origin}/feed.xml" rel="self" type="application/rss+xml"/>`;
        xml += `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`;
        xml += `<image><url>${origin}/uploads/logo.png</url><title>AperionX</title><link>${origin}</link></image>`;

        for (const article of articles) {
            let authorName = 'AperionX Yazarı';
            try {
                const [authorRows] = await pool.query('SELECT fullname FROM users WHERE id = ?', [article.author_id]);
                if (authorRows.length > 0) authorName = authorRows[0].fullname;
            } catch (e) { /* ignore */ }

            const articleUrl = `${origin}/makale/${article.slug}`;
            const pubDate = new Date(article.created_at).toUTCString();
            const safeTitle = (article.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const safeExcerpt = (article.excerpt || article.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const imgUrl = article.image_url
                ? (article.image_url.startsWith('http') ? article.image_url : `${origin}/${article.image_url}`)
                : `${origin}/uploads/logo.png`;

            xml += '<item>';
            xml += `<title>${safeTitle}</title>`;
            xml += `<link>${articleUrl}</link>`;
            xml += `<description>${safeExcerpt}</description>`;
            xml += `<author>${authorName}</author>`;
            xml += `<guid isPermaLink="true">${articleUrl}</guid>`;
            xml += `<pubDate>${pubDate}</pubDate>`;
            if (article.category) xml += `<category>${article.category}</category>`;
            xml += `<media:content url="${imgUrl}" medium="image"/>`;
            xml += `<enclosure url="${imgUrl}" length="0" type="image/jpeg"/>`;
            xml += '</item>';
        }

        xml += '</channel></rss>';

        res.header('Content-Type', 'application/rss+xml; charset=utf-8');
        res.send(xml);
    } catch (e) {
        console.error('RSS Feed Error:', e);
        res.status(500).send('Error generating RSS feed');
    }
});

// === SITEMAP ROUTE ===
app.get('/sitemap.xml', async (req, res) => {
    try {
        const [articles] = await pool.query("SELECT slug, created_at FROM articles WHERE status = 'published' ORDER BY created_at DESC");
        const origin = `${req.protocol}://${req.get('host')}`;

        let xml = '<?xml version="1.0" encoding="UTF-8"?>';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">';

        // Static Pages
        const staticPages = ['', '/articles.html', '/about.html', '/author.html', '/index.html'];
        staticPages.forEach(page => {
            const pathUrl = page === '' ? '/' : page;
            const enPath = page === '' ? '/en/' : '/en' + page;
            xml += `
            <url>
                <loc>${origin}${pathUrl}</loc>
                <xhtml:link rel="alternate" hreflang="tr" href="${origin}${pathUrl}"/>
                <xhtml:link rel="alternate" hreflang="en" href="${origin}${enPath}"/>
                <xhtml:link rel="alternate" hreflang="x-default" href="${origin}${pathUrl}"/>
                <changefreq>daily</changefreq>
                <priority>0.8</priority>
            </url>`;
        });

        // Dynamic Articles
        articles.forEach(article => {
            const date = new Date(article.created_at).toISOString();
            xml += `
            <url>
                <loc>${origin}/makale/${article.slug}</loc>
                <xhtml:link rel="alternate" hreflang="tr" href="${origin}/makale/${article.slug}"/>
                <xhtml:link rel="alternate" hreflang="en" href="${origin}/en/makale/${article.slug}"/>
                <xhtml:link rel="alternate" hreflang="x-default" href="${origin}/makale/${article.slug}"/>
                <lastmod>${date}</lastmod>
                <changefreq>weekly</changefreq>
                <priority>1.0</priority>
            </url>`;
        });

        xml += '</urlset>';

        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (e) {
        console.error('Sitemap Error:', e);
        fs.appendFileSync('sitemap_error.log', e.toString() + '\n');
        res.status(500).send('Error generating sitemap');
    }
});

app.get('/article-detail.html', async (req, res, next) => {
    const articleId = req.query.id;
    if (!articleId) return next();

    try {
        const [rows] = await pool.query('SELECT slug FROM articles WHERE id = ?', [articleId]);
        if (rows.length > 0 && rows[0].slug) {

            return res.redirect(301, `/makale/${rows[0].slug}`);
        }
        next();
    } catch (e) { next(); }
});
app.use(express.static(path.join(__dirname, 'public'), { setHeaders: (res, p) => { res.setHeader('Cache-Control', 'public, max-age=604800'); } }));
app.use(express.static(path.join(__dirname, 'views'), { extensions: ['html'], setHeaders: (res, p) => { if (p.endsWith('.html')) { res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); res.setHeader('Pragma', 'no-cache'); res.setHeader('Expires', '0'); } } }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }));



const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

const pool = require('./config/db');

// --- Simple API Cache ---
const apiCache = {};
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

function getCachedData(key) {
    const cached = apiCache[key];
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION_MS)) {
        return cached.data;
    }
    return null;
}

function setCachedData(key, data) {
    apiCache[key] = {
        timestamp: Date.now(),
        data: data
    };
}
function clearCache(keyPrefix) {
    Object.keys(apiCache).forEach(k => {
        if (k.startsWith(keyPrefix)) delete apiCache[k];
    });
}
// ------------------------

async function ensureSchema() {
    try {

        const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'username'");
        if (columns.length === 0) {
            console.log('Migrating: Adding username column to users table...');
            await pool.query("ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE AFTER fullname");
            console.log('Migration Code: Users table updated with username column.');
        }

        // --- NEW: Ensure article_authors table exists (Auto-Fix for Server) ---
        await pool.query(`
            CREATE TABLE IF NOT EXISTS article_authors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                article_id INT NOT NULL,
                user_id INT NOT NULL,
                order_index INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_author (article_id, user_id),
                FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('Schema Check: article_authors table ensured.');
        // ---------------------------------------------------------------------

        await pool.query(`
            CREATE TABLE IF NOT EXISTS likes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                article_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_like (user_id, article_id)
            )
        `);

        // --- NEW: Kategori Kartları Tablosu ---
        await pool.query(`
            CREATE TABLE IF NOT EXISTS category_cards (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(100) NOT NULL,
                description TEXT NOT NULL,
                icon_class VARCHAR(50) NOT NULL,
                link_url VARCHAR(255) NOT NULL,
                order_index INT DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Tablo boşsa varsayılan verileri ekle
        const [catRows] = await pool.query('SELECT COUNT(*) as cnt FROM category_cards');
        if (catRows[0].cnt === 0) {
            await pool.query(`
                INSERT INTO category_cards (title, description, icon_class, link_url, order_index) VALUES 
                ('Makaleler', 'Bilim ve teknolojinin derinliklerine inen kapsamlı analizler.', 'ph-fill ph-book-open-text', '/articles', 1),
                ('Deneyler', 'Geleceği şekillendiren araştırma ve laboratuvar sonuçları.', 'ph-fill ph-flask', '/experiments', 2),
                ('Araçlar', 'Araştırmalarınızda kullanabileceğiniz hesaplama ve analiz araçları.', 'ph-fill ph-calculator', '/tools', 3),
                ('Hakkımızda', 'Biz kimiz, vizyonumuz ne ve AperionX nasıl çalışır öğrenin.', 'ph-fill ph-users-three', '/about', 4);
            `);
            console.log('Migration Code: Kategori kartları varsayılan verileri eklendi.');
        }

        await pool.query(`
            CREATE TABLE IF NOT EXISTS comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                article_id INT NULL,
                experiment_id INT NULL,
                content TEXT NOT NULL,
                is_approved BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Ensure article_id is nullable (to allow experiment comments)
        try {
            await pool.query("ALTER TABLE comments MODIFY COLUMN article_id INT NULL");
        } catch (e) { console.error('Migration Error (Comments article_id NULL):', e); }

        // Ensure experiment_id column exists on comments
        try {
            const [expCol] = await pool.query("SHOW COLUMNS FROM comments LIKE 'experiment_id'");
            if (expCol.length === 0) {
                console.log('Migrating: Adding experiment_id to comments...');
                await pool.query("ALTER TABLE comments ADD COLUMN experiment_id INT NULL AFTER article_id");
            }
        } catch (e) { console.error('Migration Error (Comments experiment_id):', e); }

        try {
            const [cCols] = await pool.query("SHOW COLUMNS FROM comments LIKE 'is_approved'");
            if (cCols.length === 0) {
                console.log('Migrating: Adding is_approved to comments...');
                await pool.query("ALTER TABLE comments ADD COLUMN is_approved TINYINT(1) DEFAULT 0");
            }
        } catch (e) { console.error('Migration Error (Comments is_approved):', e); }


        try {
            await pool.query("SELECT bio, avatar_url, reset_token FROM users LIMIT 1");
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('Migrating: Adding missing columns (bio, avatar, reset_token) to users...');
                try { await pool.query("ALTER TABLE users ADD COLUMN bio TEXT"); } catch (e) { }
                try { await pool.query("ALTER TABLE users ADD COLUMN job_title VARCHAR(100)"); } catch (e) { }
                try { await pool.query("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255)"); } catch (e) { }
                try { await pool.query("ALTER TABLE users ADD COLUMN reset_token VARCHAR(255)"); } catch (e) { }
                try { await pool.query("ALTER TABLE users ADD COLUMN reset_token_expires DATETIME"); } catch (e) { }
            }
        }


        try {
            await pool.query("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) DEFAULT 'reader'");
            console.log('Migrating: users.role column modified to VARCHAR(50)');
        } catch (err) {
            console.error('Migration Error (Role Column):', err);
        }


        try {
            await pool.query("ALTER TABLE articles MODIFY COLUMN content LONGTEXT");
            console.log('Migrating: articles content column set to LONGTEXT');
        } catch (err) {
            console.error('Migration Error (Content LONGTEXT):', err);
        }


        await pool.query(`
            CREATE TABLE IF NOT EXISTS article_views (
                id INT AUTO_INCREMENT PRIMARY KEY,
                article_id INT NOT NULL,
                ip_address VARCHAR(45),
                viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_article_views (article_id, ip_address, viewed_at)
            )
        `);


        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(255) UNIQUE NOT NULL,
                setting_value TEXT
            )
        `);

        // === EXPERIMENTS MODULE TABLES ===
        await pool.query(`
            CREATE TABLE IF NOT EXISTS experiments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE,
                excerpt TEXT,
                objective TEXT,
                materials TEXT,
                procedure_steps LONGTEXT,
                results LONGTEXT,
                conclusion TEXT,
                image_url VARCHAR(255),
                youtube_url VARCHAR(500),
                category VARCHAR(100),
                safety_notes TEXT,
                tags TEXT,
                references_list TEXT,
                pdf_url VARCHAR(255),
                author_id INT,
                status VARCHAR(50) DEFAULT 'pending',
                rejection_reason TEXT,
                approved_by INT,
                views INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP NULL,
                FOREIGN KEY (author_id) REFERENCES users(id)
            )
        `);

        // Add deleted_at to existing tables if missing (Soft Delete support)
        try { await pool.query('ALTER TABLE experiments ADD COLUMN deleted_at TIMESTAMP NULL'); } catch(e) {}
        try { await pool.query('ALTER TABLE articles ADD COLUMN deleted_at TIMESTAMP NULL'); } catch(e) {}

        await pool.query(`
            CREATE TABLE IF NOT EXISTS experiment_authors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                experiment_id INT NOT NULL,
                user_id INT NOT NULL,
                order_index INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_exp_author (experiment_id, user_id),
                FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS experiment_views (
                id INT AUTO_INCREMENT PRIMARY KEY,
                experiment_id INT NOT NULL,
                ip_address VARCHAR(45),
                viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_experiment_views (experiment_id, ip_address, viewed_at)
            )
        `);
        // === END EXPERIMENTS MODULE TABLES ===

        // === YAZAR TAKİP MODULE TABLES ===
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tracked_authors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                phone VARCHAR(20),
                university VARCHAR(255),
                frequency INT NOT NULL DEFAULT 14,
                conversation_date DATE NOT NULL,
                notes TEXT,
                created_by INT,
                user_id INT,
                violations INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS tracked_author_articles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                author_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                article_date DATE NOT NULL,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (author_id) REFERENCES tracked_authors(id) ON DELETE CASCADE
            )
        `);

        // Migration: add violations column if it doesn't exist
        try {
            await pool.query('ALTER TABLE tracked_authors ADD COLUMN violations INT NOT NULL DEFAULT 0');
        } catch (err) {
            // Ignore if column already exists
        }

        // Migration: add university and user_id columns if they don't exist
        try {
            await pool.query('ALTER TABLE tracked_authors ADD COLUMN university VARCHAR(255)');
        } catch (err) {}
        try {
            await pool.query('ALTER TABLE tracked_authors ADD COLUMN user_id INT NULL');
            await pool.query('ALTER TABLE tracked_authors ADD CONSTRAINT fk_tracked_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL');
        } catch (err) {}

        await pool.query(`
            CREATE TABLE IF NOT EXISTS team_members (
                id INT AUTO_INCREMENT PRIMARY KEY,
                fullname VARCHAR(255) NOT NULL,
                role VARCHAR(255) NOT NULL,
                image_url VARCHAR(255),
                email VARCHAR(255),
                linkedin_url VARCHAR(255),
                order_index INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Schema Check: Likes, Comments, Views, Settings, Experiments, Users, Team Members & Yazar Takip (with Violations) ensured.');
    } catch (e) {
        console.error('Schema Table Creation Error:', e);
    }

    try {

        await pool.query("SELECT approved_by FROM articles LIMIT 1");
    } catch (e) {
        if (e.code === 'ER_BAD_FIELD_ERROR') {
            try {
                await pool.query("ALTER TABLE articles ADD COLUMN approved_by INT DEFAULT NULL");
                console.log("Added 'approved_by' column to articles table.");
            } catch (alterErr) { console.error("Error adding approved_by column:", alterErr); }
        }
    }


    try {
        await pool.query("ALTER TABLE articles MODIFY COLUMN status VARCHAR(50) DEFAULT 'draft'");
        console.log("Ensured articles.status is VARCHAR(50)");
    } catch (e) {
        console.error("Status Column Modification Error (Ignore if not needed):", e);
    }

    try {

        const neededColumns = [
            { name: 'category', def: "VARCHAR(100) DEFAULT 'Genel'" },
            { name: 'tags', def: "TEXT" },
            { name: 'references_list', def: "TEXT" },
            { name: 'visual_references_list', def: "TEXT" },
            { name: 'pdf_url', def: "VARCHAR(255)" }
        ];

        for (const col of neededColumns) {
            try {
                await pool.query(`SELECT ${col.name} FROM articles LIMIT 1`);
            } catch (err) {
                if (err.code === 'ER_BAD_FIELD_ERROR') {
                    console.log(`Migrating: Adding ${col.name} to articles...`);
                    await pool.query(`ALTER TABLE articles ADD COLUMN ${col.name} ${col.def}`);
                }
            }
        }

        // --- NEW: Ensure parent_id exists in menu_items ---
        try {
            await pool.query("SELECT parent_id FROM menu_items LIMIT 1");
        } catch (e) {
            if (e.code === 'ER_BAD_FIELD_ERROR') {
                console.log('Migrating: Adding parent_id to menu_items...');
                await pool.query("ALTER TABLE menu_items ADD COLUMN parent_id INT DEFAULT NULL");
                await pool.query("ALTER TABLE menu_items ADD FOREIGN KEY (parent_id) REFERENCES menu_items(id) ON DELETE CASCADE");
            }
        }
        // --------------------------------------------------

    } catch (e) {
        console.error('Auto-migration Error:', e);
    }
}


console.log('--- APERIONX SERVER VERSION 2.3 FINAL (ROBUST SETTINGS) STARTING ---');
ensureSchema();

// === SHOWCASE ROTATION LOGIC ===
async function rotateShowcaseArticles() {
    try {
        const [rows] = await pool.query("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('showcase_auto_rotate', 'showcase_last_rotate_time', 'showcase_current_offset')");
        const settings = {};
        rows.forEach(r => settings[r.setting_key] = r.setting_value);

        if (settings.showcase_auto_rotate !== 'true') return;

        const lastRotate = settings.showcase_last_rotate_time ? new Date(settings.showcase_last_rotate_time) : new Date(0);
        const now = new Date();
        const diffMs = now - lastRotate;
        const diffHours = diffMs / (1000 * 60 * 60);

        // Rotate every 3 hours
        if (diffHours >= 3) {
            console.log('[SHOWCASE] Auto-rotating articles...');

            // 1. Fetch all published articles
            const [articles] = await pool.query("SELECT id FROM articles WHERE status = 'published' ORDER BY created_at DESC");
            if (articles.length === 0) return;

            let offset = parseInt(settings.showcase_current_offset || '0');
            if (isNaN(offset)) offset = 0;

            // Calculate new items
            // We want 3 items. 
            // Cycle through the list.
            const len = articles.length;
            const newIds = [];

            // Just take next 3, wrapping around
            for (let i = 0; i < 3; i++) {
                newIds.push(articles[(offset + i) % len].id);
            }

            // Update Offset for next time (advance by 3)
            const newOffset = (offset + 3) % len;

            // 2. Update Settings
            // homepage_article_1, homepage_article_2, homepage_article_3
            const updates = [
                { key: 'homepage_article_1', value: newIds[0] },
                { key: 'homepage_article_2', value: newIds[1] },
                { key: 'homepage_article_3', value: newIds[2] },
                { key: 'showcase_last_rotate_time', value: now.toISOString() },
                { key: 'showcase_current_offset', value: newOffset }
            ];

            for (const item of updates) {
                // Upsert
                const [check] = await pool.query('SELECT id FROM settings WHERE setting_key = ?', [item.key]);
                if (check.length > 0) {
                    await pool.query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [item.value, item.key]);
                } else {
                    await pool.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', [item.key, item.value]);
                }
            }

            console.log(`[SHOWCASE] Rotated to IDs: ${newIds.join(', ')}. Next Offset: ${newOffset}`);
        }

    } catch (e) {
        console.error('[SHOWCASE] Rotation Error:', e);
    }
}

// Run rotation check every minute
setInterval(rotateShowcaseArticles, 60 * 1000);
// Also run on startup after a slight delay
setTimeout(rotateShowcaseArticles, 5000);







// === GET AUTHOR LIKES (New Feature) ===
app.get('/api/author/likes', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                u.fullname AS liker_name, 
                u.avatar_url AS liker_avatar, 
                a.title AS article_title, 
                l.created_at
            FROM likes l
            JOIN articles a ON l.article_id = a.id
            JOIN users u ON l.user_id = u.id
            WHERE a.author_id = ?
            ORDER BY l.created_at DESC
        `;
        const [rows] = await pool.query(query, [req.user.id]);
        res.json(rows);
    } catch (e) {
        console.error('Author Likes Error:', e);
        res.status(500).json({ message: 'Beğeni verileri alınamadı.' });
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const prefix = file.mimetype.startsWith('application/pdf') ? 'pdf' : (file.fieldname === 'site_logo' ? 'site_logo' : (file.fieldname === 'site_favicon' ? 'site_favicon' : (file.fieldname === 'avatar' ? 'avatar' : (file.fieldname === 'about_us_image' ? 'about_us' : 'image'))));
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, prefix + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fieldSize: 100 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Geçersiz dosya türü. Sadece Resim ve PDF dosyaları yüklenebilir.'));
        }
    }
});

const articleStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/article_images/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'article-' + uniqueSuffix + ext);
    }
});
const uploadArticleImage = multer({ storage: articleStorage });

const optimizeImageMiddleware = async (req, res, next) => {
    if (!req.file || req.file.mimetype === 'application/pdf') return next();
    try {
        const filePath = req.file.path;
        const tempPath = filePath + '.tmp';
        const metadata = await sharp(filePath).metadata();
        let image = sharp(filePath);
        if (metadata.width > 1600) image = image.resize({ width: 1600, withoutEnlargement: true });
        
        if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
            image = image.jpeg({ quality: 80 });
        } else if (metadata.format === 'png') {
            image = image.png({ quality: 80, compressionLevel: 8 });
        } else if (metadata.format === 'webp') {
            image = image.webp({ quality: 80 });
        }
        
        await image.toFile(tempPath);
        fs.renameSync(tempPath, filePath);
        next();
    } catch (err) {
        console.error('Image optimization error:', err);
        next();
    }
};

app.post('/api/upload', authenticateToken, uploadArticleImage.single('image'), optimizeImageMiddleware, (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    res.json({ url: `uploads/article_images/${req.file.filename}` });
});

function authenticateToken(req, res, next) {
    console.log('Middleware: authenticateToken called');
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        console.log('Middleware: No token provided');
        return res.sendStatus(401);
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Middleware: Token verification failed:', err.message);
            return res.sendStatus(403);
        }
        console.log('Middleware: Token valid for user:', user.email);
        req.user = user;
        req.user.role = user.role || 'user'; // Ensure role is explicitly set
        next();
    });
}

function checkRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ error: 'Erişim reddedildi: Rol bilgisi bulunamadı.' });
        }
        if (allowedRoles.includes(req.user.role)) {
            next();
        } else {
            return res.status(403).json({ error: 'Erişim reddedildi: Bu işlem için yetki yetersiz.' });
        }
    };
}

async function sendDynamicEmail(to, type, variablesOrBody = {}, subjectOverride = null) {
    try {
        let subject = 'AperionX Bildirim';
        let body = '';

        if (type === 'custom') {

            subject = subjectOverride || 'AperionX Bildirim';
            body = typeof variablesOrBody === 'string' ? variablesOrBody : JSON.stringify(variablesOrBody);
        } else {

            const [rows] = await pool.query('SELECT * FROM site_settings WHERE setting_key LIKE ? OR setting_key LIKE ?', [`email_${type}_subject`, `email_${type}_body`]);
            const settings = {};
            rows.forEach(r => settings[r.setting_key] = r.setting_value);

            subject = settings[`email_${type}_subject`] || 'AperionX Bildirim';
            body = settings[`email_${type}_body`] || 'Merhaba, bir bildiriminiz var.';
        }


        if (typeof variablesOrBody === 'object') {
            Object.keys(variablesOrBody).forEach(key => {
                const regex = new RegExp(`{${key}}`, 'g');
                subject = subject.replace(regex, variablesOrBody[key]);
                body = body.replace(regex, variablesOrBody[key]);
            });
        }

        // 1. Fetch site_logo from settings if not provided
        let logoLink = 'https://ui-avatars.com/api/?name=AX&background=random';

        if (typeof variablesOrBody === 'object' && variablesOrBody.logoUrl) {
            logoLink = variablesOrBody.logoUrl;
        } else {
            // Try to find logo in DB settings
            try {
                const [logoRow] = await pool.query("SELECT setting_value FROM settings WHERE setting_key = 'site_logo'");
                if (logoRow.length > 0 && logoRow[0].setting_value) {
                    logoLink = logoRow[0].setting_value;
                    // FIX: Process relative paths (uploads/...) to be absolute
                    if (logoLink && !logoLink.startsWith('http')) {
                        // Ensure it starts with / if missing (though usually saved as uploads/...)
                        const cleanPath = logoLink.startsWith('/') ? logoLink.substring(1) : logoLink;
                        logoLink = 'https://aperionx.com/' + cleanPath;
                    }
                }
            } catch (e) { /* ignore db error for logo */ }
        }
        // HTML Template
        const html = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb; padding: 40px 0;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    <!-- Header -->
                    <div style="background-color: #ffffff; padding: 30px; text-align: center; border-bottom: 2px solid #f3f4f6;">
                         <img src="${logoLink}" alt="AperionX" style="height: 48px; object-fit: contain;">
                    </div>
                    
                    <!-- Content -->
                    <div style="padding: 40px 30px; color: #374151; line-height: 1.6;">
                        ${body}
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 13px;">
                        <p>&copy; ${new Date().getFullYear()} AperionX. Tüm hakları saklıdır.</p>
                        <p>Bu otomatik bir mesajdır, lütfen yanıtlamayınız.</p>
                    </div>
                </div>
            </div>
        `;

        // Send
        // Fetch SMTP Settings
        const [smtpRows] = await pool.query('SELECT * FROM settings WHERE setting_key LIKE ?', ['smtp_%']);
        const smtpConfig = {};
        smtpRows.forEach(r => smtpConfig[r.setting_key] = r.setting_value);

        let transporter = nodemailer.createTransport({
            host: smtpConfig.smtp_host || process.env.SMTP_HOST,
            port: smtpConfig.smtp_port || process.env.SMTP_port || 587,
            secure: (smtpConfig.smtp_secure === 'true') || (process.env.SMTP_SECURE === 'true'),
            auth: {
                user: smtpConfig.smtp_user || process.env.SMTP_USER,
                pass: smtpConfig.smtp_pass || process.env.SMTP_PASS
            },
            // Debug options
            logger: true,
            debug: true
        });

        console.log(`[EMAIL-DEBUG] Sending to: ${to}, ConfigHost: ${smtpConfig.smtp_host || process.env.SMTP_HOST}`);

        const senderEmail = smtpConfig.smtp_user || process.env.SMTP_USER;
        const info = await transporter.sendMail({
            from: `"AperionX" <${senderEmail}>`,
            to: to,
            subject: subject,
            html: html
        });

        console.log(`[Email] Sent '${type}' email to ${to}`);
        return true;

    } catch (e) {
        console.error('[Email Helper Error]:', e);
        return false;
    }
}

// 4. Ensure Template Defaults
async function ensureEmailTemplateSettings() {
    try {
        const [rows] = await pool.query("SELECT setting_key FROM site_settings WHERE setting_key LIKE 'email_%'");
        const keys = rows.map(r => r.setting_key);

        const defaults = {
            'email_welcome_subject': 'AperionX Ailesine Hoş Geldiniz! 🚀',
            'email_welcome_body': '<h2 style="color: #4f46e5; margin-bottom: 20px;">Hoş Geldin {name}!</h2><p>Aramıza katılmana çok sevindik. Bilim, teknoloji ve sanatın buluşma noktası olan AperionX\'te keşfedecek çok şey var.</p><p>Hesabın başarıyla oluşturuldu.</p><div style="text-align: center; margin: 30px 0;"><a href="{actionLink}" style="background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">{actionText}</a></div><p>İyi okumalar dileriz!</p>',
            'email_reset_subject': 'Şifre Sıfırlama Talebi 🔒',
            'email_reset_body': '<h2 style="color: #ef4444; margin-bottom: 20px;">Şifre Sıfırlama</h2><p>Hesabınız için bir şifre sıfırlama talebi aldık. Eğer bu talebi siz yaptıysanız, aşağıdaki butona tıklayarak yeni şifrenizi belirleyebilirsiniz:</p><div style="text-align: center; margin: 30px 0;"><a href="{actionLink}" style="background-color: #ef4444; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">{actionText}</a></div><p style="font-size: 0.9em; color: #666;">Bu işlemi siz yapmadıysanız, hesabınız güvendedir. Bu e-postayı görmezden gelebilirsiniz.</p>'
        };

        for (const [key, val] of Object.entries(defaults)) {
            if (!keys.includes(key)) {
                await pool.query('INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)', [key, val]);
                console.log(`[SEED] Added default setting for ${key}`);
            }
        }
    } catch (e) { console.error('Template Seed Error:', e); }
}
ensureEmailTemplateSettings();


// === SEO & ROBOTS ===
app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *\nAllow: /\nSitemap: https://${req.get('host')}/sitemap.xml`);
});


// [REMOVED DUPLICATE SITEMAP ROUTE] - Using improved version below


// === AUTH ROUTES ===

// Register
// Auth routes consolidated below


// [REMOVED DUPLICATE SETTINGS ROUTES] - Authenticated settings logic moved to end of file




// Newsletter Subscribe
app.post('/api/subscribe', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'E-posta gerekli.' });

    try {
        await pool.query('INSERT INTO newsletter_subscribers (email) VALUES (?)', [email]);
        res.status(201).json({ message: 'Abone oldunuz!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Bu e-posta zaten kayıtlı.' });
        }
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
});

// Get Subscribers (Admin only)
app.get('/api/subscribers', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [rows] = await pool.query('SELECT * FROM newsletter_subscribers ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete Subscriber (Admin only)
app.delete('/api/subscribers/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        await pool.query('DELETE FROM newsletter_subscribers WHERE id = ?', [req.params.id]);
        res.json({ message: 'Abone silindi.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// === MENU EDITOR ROUTES ===
app.get('/api/menu', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM menu_items ORDER BY COALESCE(parent_id, 0) ASC, order_index ASC');
        res.json(rows);
    } catch (e) { res.status(500).send(e.toString()); }
});

app.post('/api/menu', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { label, url, parent_id } = req.body;
    try {
        const [max] = await pool.query('SELECT MAX(order_index) as maxOrder FROM menu_items WHERE COALESCE(parent_id, 0) = COALESCE(?, 0)', [parent_id || null]);
        const nextOrder = (max[0].maxOrder || 0) + 1;
        await pool.query('INSERT INTO menu_items (label, url, order_index, parent_id) VALUES (?, ?, ?, ?)', [label, url, nextOrder, parent_id || null]);
        res.status(201).json({ message: 'Menu item added' });
    } catch (e) {
        console.error('DEBUG: Menu Add Error:', e);
        res.status(500).send(e.toString());
    }
});

app.delete('/api/menu/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        await pool.query('DELETE FROM menu_items WHERE id = ?', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (e) { res.status(500).send(e.toString()); }
});

app.put('/api/menu/reorder', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { items } = req.body; // Array of { id, order_index }
    if (!items || !Array.isArray(items)) return res.sendStatus(400);

    try {
        for (const item of items) {
            await pool.query('UPDATE menu_items SET order_index = ?, parent_id = ? WHERE id = ?', [item.order_index, item.parent_id || null, item.id]);
        }
        res.json({ message: 'Reordered' });
    } catch (e) { res.status(500).send(e.toString()); }
});

app.get('/api/hero-slides', async (req, res) => {
    try {
        const cacheKey = 'hero_slides';
        const cached = getCachedData(cacheKey);
        if (cached) return res.json(cached);

        const [rows] = await pool.query('SELECT * FROM hero_slides ORDER BY order_index ASC');
        setCachedData(cacheKey, rows);
        res.json(rows);
    } catch (e) { res.status(500).send(e); }
});

app.post('/api/hero-slides', authenticateToken, upload.single('image'), optimizeImageMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const image_url = 'uploads/' + req.file.filename;
        await pool.query('INSERT INTO hero_slides (image_url) VALUES (?)', [image_url]);
        res.json({ message: 'Slide added' });
    } catch (e) { res.status(500).send(e); }
});

app.delete('/api/hero-slides/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    await pool.query('DELETE FROM hero_slides WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
});

// 2. Admin - User Management
app.get('/api/admin/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const [users] = await pool.query('SELECT id, fullname, email, role, created_at FROM users');
    res.json(users);
});

app.post('/api/admin/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { fullname, email, username, password, role } = req.body;
    if (!fullname || !email || !password) return res.status(400).json({ error: 'Tüm alanlar gerekli.' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Use provided role or default to 'user'
        const userRole = role || 'user';

        // Generate username from email if not provided
        const finalUsername = username || email.split('@')[0] + Math.floor(Math.random() * 1000);

        const [result] = await pool.query('INSERT INTO users (fullname, email, username, password, role) VALUES (?, ?, ?, ?, ?)',
            [fullname, email, finalUsername, hashedPassword, userRole]);

        // Send Welcome Email
        try {
            const welcomeTitle = "Aramıza Hoş Geldiniz - AperionX";
            const welcomeBody = `
                <h2>Merhaba ${fullname},</h2>
                <p>AperionX ailesine katıldığınız için çok mutluyuz. Bilim ve teknolojinin sınırlarını zorlayan bu yolculukta sizinle beraber olmak harika.</p>
                <p>Hesabınızla giriş yaparak makaleleri okuyabilir, yorum yapabilir ve kendi içeriklerinizi oluşturabilirsiniz.</p>
                <p><strong>Giriş Bilgileriniz:</strong><br>
                E-posta: ${email}<br>
                Şifre: ${password}</p>
                <br>
                <a href="https://aperionx.com" style="display:inline-block; padding:10px 20px; background-color:#6366F1; color:white; text-decoration:none; border-radius:5px;">AperionX'i Keşfet</a>
            `;
            await sendDynamicEmail(email, welcomeTitle, welcomeBody, 'welcome');
        } catch (emailErr) {
            console.error('Welcome Email Failed:', emailErr);
            // Don't fail registration just because email failed
        }

        res.status(201).json({ message: 'Kayıt başarılı! Giriş yapabilirsiniz.' });
    } catch (e) {
        console.error('User Create Error:', e);
        res.status(500).json({ error: 'E-posta veya kullanıcı adı kullanılıyor olabilir. Hata: ' + e.message });
    }
});

// New Endpoint for Multi-Author Selection
app.get('/api/users/list-authors', authenticateToken, async (req, res) => {
    try {
        // Return id, fullname, username for selection
        // Filter by role: Author, Editor, Admin (exclude standard 'user')
        const [users] = await pool.query("SELECT id, fullname, username, role FROM users WHERE role IN ('author', 'editor', 'admin') ORDER BY fullname ASC");
        res.json(users);
    } catch (e) {
        console.error('List Authors Error:', e);
        res.status(500).send(e.toString());
    }
});

// Find user by email (for co-author search)
app.get('/api/users/find-by-email', authenticateToken, async (req, res) => {
    try {
        const email = req.query.email;
        if (!email) return res.status(400).json({ message: 'Email veya kullanıcı adı gerekli' });
        const trimmed = email.trim();
        console.log('[FIND-BY-EMAIL] Searching for:', trimmed);

        // 1. Try exact match first (email or username), any role
        let [users] = await pool.query(
            "SELECT id, fullname, email, username, role FROM users WHERE email = ? OR username = ? LIMIT 1",
            [trimmed, trimmed]
        );
        console.log('[FIND-BY-EMAIL] Exact match results:', users.length, users.length > 0 ? users[0] : 'none');

        // 2. If no exact match, try partial LIKE match
        if (users.length === 0) {
            const searchPattern = '%' + trimmed + '%';
            [users] = await pool.query(
                "SELECT id, fullname, email, username, role FROM users WHERE email LIKE ? OR username LIKE ? LIMIT 1",
                [searchPattern, searchPattern]
            );
            console.log('[FIND-BY-EMAIL] LIKE match results:', users.length, users.length > 0 ? users[0] : 'none');
        }

        if (users.length === 0) return res.status(404).json({ message: 'Bu e-posta veya kullanıcı adına kayıtlı kullanıcı bulunamadı.' });
        
        // Return found user (remove role from response)
        const u = users[0];
        res.json({ id: u.id, fullname: u.fullname, email: u.email, username: u.username });
    } catch (e) {
        console.error('Find by email error:', e);
        res.status(500).send(e.toString());
    }
});

// Search authors/editors for co-author selection
app.get('/api/users/search-authors', authenticateToken, async (req, res) => {
    try {
        const term = req.query.q;
        if (!term || term.length < 2) return res.json([]);
        
        const searchPattern = '%' + term.trim() + '%';
        
        // Find users who are authors, editors, or admins
        const [users] = await pool.query(
            `SELECT id, fullname, username, avatar_url 
             FROM users 
             WHERE (fullname LIKE ? OR username LIKE ? OR email LIKE ?) 
             AND role IN ('author', 'editor', 'admin') 
             LIMIT 10`,
            [searchPattern, searchPattern, searchPattern]
        );
        
        res.json(users);
    } catch (e) {
        console.error('Search authors error:', e);
        res.status(500).send(e.toString());
    }
});
app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
});



app.get('/api/admin/detailed-stats', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [rows] = await pool.query(`
            SELECT 
                a.id, 
                a.title, 
                u.fullname as author_name, 
                a.views, 
                (SELECT COUNT(*) FROM likes WHERE article_id = a.id) as like_count, 
                (SELECT COUNT(*) FROM comments WHERE article_id = a.id) as comment_count 
            FROM articles a 
            LEFT JOIN users u ON a.author_id = u.id 
            WHERE a.status = 'published'
            ORDER BY a.views DESC
        `);
        res.json(rows);
    } catch (e) { res.status(500).send(e.toString()); }
});

app.get('/api/admin/likes', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [rows] = await pool.query(`
            SELECT 
                l.id, 
                u.fullname as user_name, 
                a.title as article_title, 
                l.created_at 
            FROM likes l 
            JOIN users u ON l.user_id = u.id 
            JOIN articles a ON l.article_id = a.id 
            ORDER BY l.created_at DESC
        `);
        res.json(rows);
    } catch (e) { res.status(500).send(e.toString()); }
});

app.get('/api/admin/all-articles', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [rows] = await pool.query(`
            SELECT a.id, a.title, a.slug, a.category, a.status, a.views, a.created_at, a.image_url, u.fullname as author_name  
            FROM articles a 
            LEFT JOIN users u ON a.author_id = u.id 
            ORDER BY a.created_at DESC
        `);
        res.json(rows);
    } catch (e) { res.status(500).send(e.toString()); }
});


// 3. Articles (GET Public, POST Author)
// ==========================================
// CATEGORY CARDS API ROUTES
// ==========================================

// Get all category cards (Public)
app.get('/api/category_cards', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM category_cards ORDER BY order_index ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
});

// Add new category card (Admin only)
app.post('/api/category_cards', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Yetkisiz erişim.' });
    }
    const { title, description, icon_class, link_url, order_index } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO category_cards (title, description, icon_class, link_url, order_index) VALUES (?, ?, ?, ?, ?)',
            [title, description, icon_class, link_url, order_index || 0]
        );
        res.status(201).json({ id: result.insertId, message: 'Kategori başarıyla eklendi.' });
    } catch (error) {
        console.error('Error adding category:', error);
        res.status(500).json({ message: 'Kategori eklenemedi.' });
    }
});

// Update category card (Admin only)
app.put('/api/category_cards/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Yetkisiz erişim.' });
    const { id } = req.params;
    const { title, description, icon_class, link_url, order_index } = req.body;
    try {
        await pool.query(
            'UPDATE category_cards SET title = ?, description = ?, icon_class = ?, link_url = ?, order_index = ? WHERE id = ?',
            [title, description, icon_class, link_url, order_index || 0, id]
        );
        res.json({ message: 'Kategori başarıyla güncellendi.' });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ message: 'Kategori güncellenemedi.' });
    }
});

// Delete category card (Admin only)
app.delete('/api/category_cards/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Yetkisiz erişim.' });
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM category_cards WHERE id = ?', [id]);
        res.json({ message: 'Kategori başarıyla silindi.' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ message: 'Kategori silinemedi.' });
    }
});

app.get('/api/articles', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : null;
        const idsParam = req.query.ids ? req.query.ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : null;

        const cacheKey = `articles_${limit || 'all'}_${req.query.ids || 'all'}`;
        const cached = getCachedData(cacheKey);
        if (cached) return res.json(cached);

        // 1. Fetch Articles
        let query = "SELECT id, title, slug, excerpt, image_url, category, created_at, views, author_id, tags FROM articles WHERE status = 'published'";
        const params = [];

        if (idsParam && idsParam.length > 0) {
            query += " AND id IN (?)";
            params.push(idsParam);
        }

        query += " ORDER BY created_at DESC";

        if (limit && (!idsParam || idsParam.length === 0)) {
            query += " LIMIT ?";
            params.push(limit);
        }

        const [articles] = await pool.query(query, params);

        if (articles.length > 0) {
            const articleIds = articles.map(a => a.id);

            // 2. Fetch Authors for these articles
            const [allAuthors] = await pool.query(`
                SELECT aa.article_id, u.id, u.fullname, u.username 
                FROM article_authors aa
                JOIN users u ON aa.user_id = u.id
                WHERE aa.article_id IN (?)
                ORDER BY aa.order_index ASC
             `, [articleIds]);

            // 3. Map authors to articles
            const authorMap = {};
            allAuthors.forEach(row => {
                if (!authorMap[row.article_id]) authorMap[row.article_id] = [];
                authorMap[row.article_id].push({ id: row.id, fullname: row.fullname, username: row.username });
            });

            // 4. Attach to articles
            articles.forEach(a => {
                a.authors = authorMap[a.id] || [];
                if (a.authors.length > 0) {
                    a.author_name = a.authors[0].fullname; // Primary author for legacy
                    a.author_username = a.authors[0].username;
                } else {
                    // Fallback to legacy author_id if no entries in join table yet
                    // (We could fetch legacy author names here if needed, but going forward all should be in join table)
                    // For now, let's just leave it blank or fetch if strictly needed. 
                    // actually, let's do a quick fallback lookup if we want to be safe, 
                    // but simplest is to trust the join table OR the legacy ID.
                    // Let's keep it simple: if join table empty, try to populate from legacy author_id if we really want,
                    // but better to just migrate data. For new logic, we expect data in join table.
                }
            });

            // Legacy fallback: If join table empty, we might want to fill from author_id.
            // But let's assume valid data for now or simple "Yazar" fallback.
            const legacyIds = articles.filter(a => a.authors.length === 0 && a.author_id).map(a => a.author_id);
            if (legacyIds.length > 0) {
                const [legacyUsers] = await pool.query('SELECT id, fullname, username FROM users WHERE id IN (?)', [legacyIds]);
                const legacyMap = {};
                legacyUsers.forEach(u => legacyMap[u.id] = u);
                articles.forEach(a => {
                    if (a.authors.length === 0 && a.author_id && legacyMap[a.author_id]) {
                        const u = legacyMap[a.author_id];
                        a.authors = [{ id: u.id, fullname: u.fullname, username: u.username }];
                        a.author_name = u.fullname;
                    }
                });
            }
        }

        // DEBUG: Log first article authors to check what is sent
        if (articles.length > 0) {
            console.log('[DEBUG API] /api/articles First Item Authors:', JSON.stringify(articles[0].authors));
        }

        setCachedData(cacheKey, articles);
        res.json(articles);
    } catch (e) {
        console.error('API Articles Error:', e);
        res.status(500).send(e.toString());
    }
});

// Public Experiments Endpoint
app.get('/api/experiments', async (req, res) => {
    try {
        const cacheKey = 'experiments';
        const cached = getCachedData(cacheKey);
        if (cached) return res.json(cached);

        // 1. Fetch Experiments
        const [experiments] = await pool.query("SELECT id, title, slug, excerpt, image_url, category, created_at, views, author_id, tags FROM experiments WHERE status = 'published' AND deleted_at IS NULL ORDER BY created_at DESC");

        if (experiments.length > 0) {
            const expIds = experiments.map(e => e.id);

            // 2. Fetch Authors for these experiments
            const [allAuthors] = await pool.query(`
                SELECT ea.experiment_id, u.id, u.fullname, u.username 
                FROM experiment_authors ea
                JOIN users u ON ea.user_id = u.id
                WHERE ea.experiment_id IN (?)
                ORDER BY ea.order_index ASC
             `, [expIds]);

            // 3. Map authors to experiments
            const authorMap = {};
            allAuthors.forEach(row => {
                if (!authorMap[row.experiment_id]) authorMap[row.experiment_id] = [];
                authorMap[row.experiment_id].push({ id: row.id, fullname: row.fullname, username: row.username });
            });

            // 4. Attach to experiments
            experiments.forEach(e => {
                e.authors = authorMap[e.id] || [];
                if (e.authors.length > 0) {
                    e.author_name = e.authors[0].fullname; 
                    e.author_username = e.authors[0].username;
                }
            });

            // Legacy fallback
            const legacyIds = experiments.filter(e => e.authors.length === 0 && e.author_id).map(e => e.author_id);
            if (legacyIds.length > 0) {
                const [legacyUsers] = await pool.query('SELECT id, fullname, username FROM users WHERE id IN (?)', [legacyIds]);
                const legacyMap = {};
                legacyUsers.forEach(u => legacyMap[u.id] = u);
                experiments.forEach(e => {
                    if (e.authors.length === 0 && e.author_id && legacyMap[e.author_id]) {
                        e.author_name = legacyMap[e.author_id].fullname;
                        e.author_username = legacyMap[e.author_id].username;
                    }
                });
            }
        }

        setCachedData(cacheKey, experiments);
        res.json(experiments);
    } catch (e) {
        console.error('API Experiments Error:', e);
        res.status(500).send(e.toString());
    }
});

// GET Single Experiment by ID or Slug for Frontend API
app.get('/api/experiments/:key', async (req, res) => {
    const key = req.params.key;
    try {
        let sql = "SELECT * FROM experiments WHERE status = 'published' AND deleted_at IS NULL AND ";
        let params = [];

        if (/^\d+$/.test(key)) {
            sql += 'id = ?';
            params = [key];
        } else {
            sql += 'slug = ?';
            params = [key];
        }

        const [rows] = await pool.query(sql, params);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Experiment not found' });
        }

        const experiment = rows[0];

        // Fetch authors
        const authors = await getExperimentAuthors(pool, experiment.id);
        experiment.authors = authors;

        if (authors.length > 0) {
            experiment.author_name = authors[0].fullname;
            experiment.author_username = authors[0].username;
            experiment.author_avatar = authors[0].avatar_url;
        } else {
            experiment.author_name = 'Yazar';
        }

        res.json(experiment);
    } catch (e) {
        console.error('API Experiment Detail Error:', e);
        res.status(500).send(e.toString());
    }
});

// Get My Articles (Moved to /api/author namespace to avoid collision)
app.get('/api/author/articles', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT a.id, a.title, a.slug, a.category, a.status, a.views, a.created_at, a.image_url, a.rejection_reason, 
            (SELECT COUNT(*) FROM likes WHERE article_id = a.id) as like_count,
            (SELECT COUNT(*) FROM comments WHERE article_id = a.id) as comment_count
            FROM articles a 
            WHERE author_id = ? 
            ORDER BY created_at DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

// GET// My Articles Endpoint
app.get('/api/articles/my-articles', authenticateToken, async (req, res) => {
    console.log('[DEBUG] Route Hit: /api/articles/my-articles (User ID: ' + req.user.id + ')');
    try {
        const [rows] = await pool.query(`
            SELECT a.id, a.title, a.slug, a.category, a.status, a.views, a.created_at, a.image_url, a.rejection_reason, 
            (SELECT COUNT(*) FROM likes WHERE article_id = a.id) as like_count,
            (SELECT COUNT(*) FROM comments WHERE article_id = a.id) as comment_count
            FROM articles a 
            WHERE author_id = ? 
            ORDER BY created_at DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (e) {
        console.error('CRITICAL ERROR in /api/articles/my-articles:', e);
        const fs = require('fs');
        const logMsg = `[${new Date().toISOString()}] ERROR /api/articles/my-articles: ${e.stack || e}\n`;
        try { fs.appendFileSync('server_error.log', logMsg); } catch (err) { console.error(err); }
        res.status(500).send('DB_ERR: ' + e.toString());
    }
});

// GET Single Article by ID or Slug for Frontend API
app.get('/api/articles/:key', async (req, res) => {
    const key = req.params.key;
    try {
        let sql = 'SELECT * FROM articles WHERE ';
        let params = [];

        // Check if numeric ID
        if (/^\d+$/.test(key)) {
            sql += 'id = ?';
            params = [key];
        } else {
            sql += 'slug = ?';
            params = [key];
        }

        const [rows] = await pool.query(sql, params);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Article not found' });
        }

        const article = rows[0];

        // View counting is handled by the SSR /makale/:slug route only
        // No view increment here to prevent double counting

        // Fetch authors
        const authors = await getArticleAuthors(pool, article.id);
        article.authors = authors;

        // Backward compatibility
        if (authors.length > 0) {
            article.author_name = authors[0].fullname;
            article.author_username = authors[0].username;
            article.author_avatar = authors[0].avatar_url;
        } else {
            article.author_name = 'Yazar';
        }

        res.json(article);
    } catch (e) {
        console.error('API Article Detail Error:', e);
        res.status(500).send(e.toString());
    }
});

// Unsubscribe Endpoint (Public)
app.post('/api/public/unsubscribe', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'E-posta gerekli.' });

    try {
        const [result] = await pool.query('UPDATE users SET is_subscribed = 0 WHERE email = ?', [email]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Bu e-posta kayıtlı değil.' });
        }
        res.json({ message: 'Abonelikten çıkıldı.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
});

// Helper Function: Send New Article Notification
// [Duplicate Function Removed]

// NEW: Public Author Profile Endpoint
app.get('/api/public/author/:identifier', async (req, res) => {
    try {
        const key = req.params.identifier;
        console.log('[API] Fetching author profile for:', key);

        // 1. Try by Username (Exact match)
        let sql = 'SELECT id, fullname, username, bio, job_title, avatar_url, created_at FROM users WHERE username = ?';
        let params = [key];

        // 2. Try by ID
        if (/^\d+$/.test(key)) {
            sql = 'SELECT id, fullname, username, bio, job_title, avatar_url, created_at FROM users WHERE id = ? OR username = ?';
            params = [key, key];
        }
        // 3. Try by Fullname (Fallback if sent directly)
        else {
            sql = 'SELECT id, fullname, username, bio, job_title, avatar_url, created_at FROM users WHERE username = ? OR fullname = ?';
            params = [key, key];
        }

        const [users] = await pool.query(sql, params);

        if (users.length === 0) {
            return res.status(404).json({ message: 'Yazar bulunamadı' });
        }

        const user = users[0];

        // 2. Get Published Articles
        const [articles] = await pool.query(`
            SELECT id, title, slug, excerpt, image_url, category, created_at,
            (SELECT COUNT(*) FROM comments WHERE article_id = articles.id AND is_approved = 1) as comment_count
            FROM articles 
            WHERE author_id = ? AND status = 'published'
            ORDER BY created_at DESC
        `, [user.id]);

        res.json({
            profile: user,
            articles: articles
        });

    } catch (e) {
        console.error('Public Author Profile Error:', e);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});


// Moved to top to avoid collision with :key

app.post('/api/articles', authenticateToken, upload.any(), async (req, res) => {
    // Both Author and Admin can post.
    // Logic: If Author -> status defaults to 'pending' (unless saving as draft).
    // If Admin -> can publish directly (optional, but let's stick to flow or allow override).

    // Status Logic:
    // If user sends 'draft', it is 'draft'.
    // If user sends 'published':
    //    If role is 'author' -> FORCE 'pending'.
    //    If role is 'admin' or 'editor' -> ALLOW 'published'.

    const body = req.body || {};
    const { title, category, content, excerpt, status, tags, references_list, visual_references_list } = body;
    let author_ids = body.author_ids; // Expecting array or JSON string

    if (typeof author_ids === 'string') {
        try { author_ids = JSON.parse(author_ids); } catch (e) { }
    }
    if (!Array.isArray(author_ids)) author_ids = [req.user.id]; // Default to creator if empty

    console.log('Route: POST /api/articles', { title, status, statusType: typeof status, role: req.user.role });

    let image_url = null;
    let pdf_url = null;

    if (req.files) {
        const imgFile = req.files.find(f => f.fieldname === 'image');
        const pdfFile = req.files.find(f => f.fieldname === 'pdf');
        if (imgFile) image_url = 'uploads/' + imgFile.filename;
        if (pdfFile) pdf_url = 'uploads/' + pdfFile.filename;
    }

    let finalStatus = status;
    console.log(`[DEBUG] POST Article - User Role: ${req.user.role}, Requested Status: ${status}`);

    if (status === 'published' && req.user.role !== 'admin' && req.user.role !== 'editor') {
        finalStatus = 'pending';
        console.log('[DEBUG] Enforcing PENDING status for non-admin/editor');
    }

    try {
        // Sanitize Content
        const cleanContent = DOMPurify.sanitize(content);

        // Generate Slug
        const slug = await getUniqueSlug(pool, title);

        const [insertResult] = await pool.query(
            'INSERT INTO articles (title, slug, category, content, image_url, author_id, excerpt, status, tags, references_list, visual_references_list, pdf_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [title, slug, category, cleanContent, image_url, req.user.id, excerpt, finalStatus, tags, references_list, visual_references_list, pdf_url]
        );

        const newArticleId = insertResult.insertId;

        // Insert Authors
        if (author_ids && author_ids.length > 0) {
            const authorValues = author_ids.map((uid, index) => [newArticleId, uid, index]);
            await pool.query('INSERT INTO article_authors (article_id, user_id, order_index) VALUES ?', [authorValues]);
        }

        console.log('Route: Article inserted successfully');

        // NOTIFY EDITORS & ADMINS if Pending
        if (finalStatus === 'pending') {
            try {
                // Get author name
                const [authors] = await pool.query('SELECT fullname FROM users WHERE id = ?', [req.user.id]);
                const authorName = authors[0]?.fullname || 'Bir Yazar';

                // Get all editors/admins
                const [destUsers] = await pool.query("SELECT id FROM users WHERE role IN ('editor', 'admin')");

                const msg = `Yeni makale onayı bekliyor: ${title.substring(0, 30)}... - ${authorName}`;
                for (const u of destUsers) {
                    if (u.id !== req.user.id) { // Don't notify self if admin
                        await createNotification(u.id, msg, 'info');
                    }
                }
            } catch (notifErr) { console.error('Notif failed:', notifErr); }
        }

        // SEO: If admin/editor published directly, ping search engines & send newsletter
        if (finalStatus === 'published') {
            pingSearchEngines(slug).catch(err => console.error('[SEO-PING] Error:', err));
            autoSendNewsletter(newArticleId).catch(err => console.error('[AUTO-NEWSLETTER] Error:', err));
        }

        res.status(201).json({ message: 'Article created', status: finalStatus, id: newArticleId });
    } catch (e) {
        console.error('Route: DB Error:', e);
        res.status(500).send(e.toString());
    }
});

// Upload Image Endpoint for Editor
app.post('/api/upload-image', authenticateToken, upload.single('image'), optimizeImageMiddleware, (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    res.json({ url: 'uploads/' + req.file.filename });
});

app.put('/api/articles/:id', authenticateToken, upload.fields([{ name: 'image' }, { name: 'pdf' }]), async (req, res) => {
    const articleId = req.params.id;
    // Verify ownership
    const [check] = await pool.query('SELECT author_id FROM articles WHERE id = ?', [articleId]);
    if (check.length === 0) return res.status(404).json({ message: 'Not found' });
    if (check[0].author_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);

    const { title, category, content, excerpt, status, tags, references_list, visual_references_list } = req.body;

    // Determine status update logic
    // If editing a 'published' article, does it go back to pending? 
    // Usually yes for major edits, but let's keep it simple: 
    // If Author sets 'published' -> 'pending'.
    let finalStatus = status;
    if (status === 'published' && req.user.role === 'author') {
        finalStatus = 'pending';
    }

    let author_ids = req.body.author_ids;
    if (typeof author_ids === 'string') {
        try { author_ids = JSON.parse(author_ids); } catch (e) { }
    }

    let updates = [];
    let params = [];

    if (title) {
        updates.push('title = ?');
        params.push(title);

        // Update slug if title changes
        const newSlug = await getUniqueSlug(pool, title, articleId);
        updates.push('slug = ?');
        params.push(newSlug);
    }
    if (category) { updates.push('category = ?'); params.push(category); }
    if (content) {
        updates.push('content = ?');
        params.push(DOMPurify.sanitize(content));
    }
    if (excerpt) { updates.push('excerpt = ?'); params.push(excerpt); }
    if (finalStatus) { updates.push('status = ?'); params.push(finalStatus); }
    if (tags) { updates.push('tags = ?'); params.push(tags); }
    if (references_list !== undefined) { updates.push('references_list = ?'); params.push(references_list); }
    if (visual_references_list !== undefined) { updates.push('visual_references_list = ?'); params.push(visual_references_list); }

    if (req.files && req.files['image']) {
        updates.push('image_url = ?');
        params.push('uploads/' + req.files['image'][0].filename);
    }
    if (req.files && req.files['pdf']) {
        updates.push('pdf_url = ?');
        params.push('uploads/' + req.files['pdf'][0].filename);
    }

    if (updates.length > 0) {
        params.push(articleId);
        await pool.query(`UPDATE articles SET ${updates.join(', ')} WHERE id = ?`, params);

        // Update Authors if provided
        if (author_ids && Array.isArray(author_ids)) {
            // Delete existing
            await pool.query('DELETE FROM article_authors WHERE article_id = ?', [articleId]);
            // Insert new
            if (author_ids.length > 0) {
                const authorValues = author_ids.map((uid, index) => [articleId, uid, index]);
                await pool.query('INSERT INTO article_authors (article_id, user_id, order_index) VALUES ?', [authorValues]);
            }
        }

        // Notification Logic
        if (finalStatus && req.user.role !== 'author') {
            const authorId = check[0].author_id;
            if (req.user.id !== authorId) {
                let msg = `Makalenizin durumu güncellendi: ${finalStatus === 'published' ? 'Yayınlandı' : (finalStatus === 'rejected' ? 'Reddedildi' : 'Onay Bekliyor')}`;
                let type = finalStatus === 'published' ? 'success' : (finalStatus === 'rejected' ? 'error' : 'info');
                await createNotification(authorId, msg, type);
            }
        }
    }
    res.json({ message: 'Updated' });
});

// === EXPERIMENTS AUTHOR API'S ===
// 1. Get Author's Experiments
app.get('/api/author/experiments', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT * FROM experiments 
            WHERE author_id = ? AND deleted_at IS NULL 
            ORDER BY created_at DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

// 2. Create Experiment (POST)
app.post('/api/experiments', authenticateToken, upload.fields([{ name: 'image' }, { name: 'pdf' }]), async (req, res) => {
    const body = req.body || {};
    const { title, category, excerpt, status, tags, objective, materials, procedure_steps, results, conclusion, safety_notes, youtube_url, references_list, coAuthors } = body;
    let author_id = req.user.id;

    let image_url = null;
    let pdf_url = null;

    if (req.files) {
        if (req.files['image']) image_url = 'uploads/' + req.files['image'][0].filename;
        if (req.files['pdf']) pdf_url = 'uploads/' + req.files['pdf'][0].filename;
    }

    let finalStatus = status;
    if (status === 'published' && req.user.role !== 'admin' && req.user.role !== 'editor') {
        finalStatus = 'pending';
    }

    try {
        const slug = await getUniqueSlug(pool, title, null, 'experiments');

        const cleanObjective = objective ? DOMPurify.sanitize(objective) : null;
        const cleanMaterials = materials ? DOMPurify.sanitize(materials) : null;
        const cleanProcedure = procedure_steps ? DOMPurify.sanitize(procedure_steps) : null;
        const cleanResults = results ? DOMPurify.sanitize(results) : null;
        const cleanConclusion = conclusion ? DOMPurify.sanitize(conclusion) : null;
        const cleanSafety = safety_notes ? DOMPurify.sanitize(safety_notes) : null;
        const cleanReferences = references_list ? DOMPurify.sanitize(references_list) : null;

        const [insertResult] = await pool.query(
            `INSERT INTO experiments (
                title, slug, excerpt, objective, materials, procedure_steps, results, conclusion, 
                image_url, youtube_url, category, safety_notes, tags, pdf_url, author_id, status, references_list
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title, slug, excerpt, cleanObjective, cleanMaterials, cleanProcedure, cleanResults, cleanConclusion,
                image_url, youtube_url, category, cleanSafety, tags, pdf_url, author_id, finalStatus, cleanReferences
            ]
        );

        const newExperimentId = insertResult.insertId;

        // Add to experiment_authors (owner + co-authors)
        let authorIdsToInsert = [author_id];
        if (coAuthors) {
            try {
                const parsedCoAuthors = JSON.parse(coAuthors);
                if (Array.isArray(parsedCoAuthors)) {
                    parsedCoAuthors.forEach(id => {
                        if (id && !authorIdsToInsert.includes(parseInt(id))) {
                            authorIdsToInsert.push(parseInt(id));
                        }
                    });
                }
            } catch (e) { console.error('Error parsing coAuthors:', e); }
        }

        const authorValues = authorIdsToInsert.map((uid, index) => [newExperimentId, uid, index]);
        if (authorValues.length > 0) {
            await pool.query('INSERT INTO experiment_authors (experiment_id, user_id, order_index) VALUES ?', [authorValues]);
        }

        // Send notifications if pending
        if (finalStatus === 'pending') {
            try {
                const [authors] = await pool.query('SELECT fullname FROM users WHERE id = ?', [req.user.id]);
                const authorName = authors[0]?.fullname || 'Bir Yazar';
                const [destUsers] = await pool.query("SELECT id FROM users WHERE role IN ('editor', 'admin')");
                const msg = `Yeni deney onayı bekliyor: ${title.substring(0, 30)}... - ${authorName}`;
                for (const u of destUsers) {
                    if (u.id !== req.user.id) {
                        await createNotification(u.id, msg, 'info');
                    }
                }
            } catch (notifErr) { console.error('Notif failed:', notifErr); }
        }

        res.status(201).json({ message: 'Experiment created', status: finalStatus });
    } catch (e) {
        console.error('Create Experiment DB Error:', e);
        res.status(500).send(e.toString());
    }
});

// 3. Update Experiment (PUT)
app.put('/api/experiments/:id', authenticateToken, upload.fields([{ name: 'image' }, { name: 'pdf' }]), async (req, res) => {
    const experimentId = req.params.id;
    const [check] = await pool.query('SELECT author_id FROM experiments WHERE id = ?', [experimentId]);
    if (check.length === 0) return res.status(404).json({ message: 'Not found' });
    if (check[0].author_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);

    const { title, category, excerpt, status, tags, objective, materials, procedure_steps, results, conclusion, safety_notes, youtube_url, references_list, coAuthors } = req.body;

    let finalStatus = status;
    if (status === 'published' && req.user.role === 'author') {
        finalStatus = 'pending';
    }

    let updates = [];
    let params = [];

    if (title) {
        updates.push('title = ?');
        params.push(title);
        const newSlug = await getUniqueSlug(pool, title, experimentId, 'experiments');
        updates.push('slug = ?');
        params.push(newSlug);
    }
    if (category) { updates.push('category = ?'); params.push(category); }
    if (excerpt) { updates.push('excerpt = ?'); params.push(excerpt); }
    if (finalStatus) { updates.push('status = ?'); params.push(finalStatus); }
    if (tags !== undefined) { updates.push('tags = ?'); params.push(tags); }
    if (youtube_url !== undefined) { updates.push('youtube_url = ?'); params.push(youtube_url); }
    if (references_list !== undefined) { updates.push('references_list = ?'); params.push(DOMPurify.sanitize(references_list)); }

    if (objective !== undefined) { updates.push('objective = ?'); params.push(DOMPurify.sanitize(objective)); }
    if (materials !== undefined) { updates.push('materials = ?'); params.push(DOMPurify.sanitize(materials)); }
    if (procedure_steps !== undefined) { updates.push('procedure_steps = ?'); params.push(DOMPurify.sanitize(procedure_steps)); }
    if (results !== undefined) { updates.push('results = ?'); params.push(DOMPurify.sanitize(results)); }
    if (conclusion !== undefined) { updates.push('conclusion = ?'); params.push(DOMPurify.sanitize(conclusion)); }
    if (safety_notes !== undefined) { updates.push('safety_notes = ?'); params.push(DOMPurify.sanitize(safety_notes)); }

    if (req.files && req.files['image']) {
        updates.push('image_url = ?');
        params.push('uploads/' + req.files['image'][0].filename);
    }
    if (req.files && req.files['pdf']) {
        updates.push('pdf_url = ?');
        params.push('uploads/' + req.files['pdf'][0].filename);
    }

    if (updates.length > 0) {
        params.push(experimentId);
        await pool.query(`UPDATE experiments SET ${updates.join(', ')} WHERE id = ?`, params);

        if (finalStatus && req.user.role !== 'author') {
            const authorId = check[0].author_id;
            if (req.user.id !== authorId) {
                let msg = `Deneyinizin durumu güncellendi: ${finalStatus === 'published' ? 'Yayınlandı' : (finalStatus === 'rejected' ? 'Reddedildi' : 'Onay Bekliyor')}`;
                let type = finalStatus === 'published' ? 'success' : (finalStatus === 'rejected' ? 'error' : 'info');
                await createNotification(authorId, msg, type);
            }
        }
    }

    // Update Co-Authors
    if (coAuthors !== undefined) {
        try {
            const parsedCoAuthors = JSON.parse(coAuthors);
            let authorIdsToInsert = [check[0].author_id]; // Owner always included
            if (Array.isArray(parsedCoAuthors)) {
                parsedCoAuthors.forEach(id => {
                    if (id && !authorIdsToInsert.includes(parseInt(id))) {
                        authorIdsToInsert.push(parseInt(id));
                    }
                });
            }
            
            await pool.query('DELETE FROM experiment_authors WHERE experiment_id = ?', [experimentId]);
            const authorValues = authorIdsToInsert.map((uid, index) => [experimentId, uid, index]);
            if (authorValues.length > 0) {
                await pool.query('INSERT INTO experiment_authors (experiment_id, user_id, order_index) VALUES ?', [authorValues]);
            }
        } catch (e) {
            console.error('Error updating coAuthors:', e);
        }
    }

    res.json({ message: 'Updated' });
});

// 4. Delete Experiment (Soft Delete)
app.delete('/api/experiments/:id', authenticateToken, async (req, res) => {
    const experimentId = req.params.id;
    try {
        const [check] = await pool.query('SELECT author_id FROM experiments WHERE id = ?', [experimentId]);
        if (check.length === 0) return res.status(404).json({ message: 'Not found' });
        if (check[0].author_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);

        await pool.query('UPDATE experiments SET deleted_at = NOW() WHERE id = ?', [experimentId]);
        res.json({ message: 'Moved to trash' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4.1. Get Trash Experiments
app.get('/api/author/trash', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT * FROM experiments 
            WHERE author_id = ? AND deleted_at IS NOT NULL 
            ORDER BY deleted_at DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4.2 Restore from Trash
app.put('/api/experiments/:id/restore', authenticateToken, async (req, res) => {
    const experimentId = req.params.id;
    try {
        const [check] = await pool.query('SELECT author_id FROM experiments WHERE id = ?', [experimentId]);
        if (check.length === 0) return res.status(404).json({ message: 'Not found' });
        if (check[0].author_id !== req.user.id && req.user.role !== 'admin') return res.sendStatus(403);

        await pool.query('UPDATE experiments SET deleted_at = NULL WHERE id = ?', [experimentId]);
        res.json({ message: 'Restored from trash' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4.3 Force Delete (Permanent)
app.delete('/api/experiments/:id/force', authenticateToken, async (req, res) => {
    const experimentId = req.params.id;
    try {
        const [check] = await pool.query('SELECT author_id FROM experiments WHERE id = ?', [experimentId]);
        if (check.length === 0) return res.status(404).json({ message: 'Not found' });
        if (check[0].author_id !== req.user.id && req.user.role !== 'admin') return res.sendStatus(403);

        await pool.query('DELETE FROM experiments WHERE id = ?', [experimentId]);
        res.json({ message: 'Permanently deleted' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 5. Get Single Experiment by ID (For Edit Form)
app.get('/api/experiments/by-id/:id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM experiments WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Experiment not found' });
        
        // Let co-authors view and edit
        const [coAuthorsList] = await pool.query('SELECT user_id FROM experiment_authors WHERE experiment_id = ?', [req.params.id]);
        const isCoAuthor = coAuthorsList.some(a => a.user_id === req.user.id);

        if (rows[0].author_id !== req.user.id && !isCoAuthor && req.user.role !== 'admin' && req.user.role !== 'editor') {
            return res.sendStatus(403);
        }

        const exp = rows[0];
        exp.co_authors = await getExperimentAuthors(pool, req.params.id);
        res.json(exp);
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

// === EXPERIMENT EDITOR API'S ===

// 1. Pending Experiments
app.get('/api/editor/pending-experiments', authenticateToken, async (req, res) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [rows] = await pool.query(`
            SELECT e.*, u.fullname as author_name 
            FROM experiments e
            LEFT JOIN users u ON e.author_id = u.id
            WHERE e.status = 'pending' 
            ORDER BY e.created_at ASC
        `);
        for (let row of rows) {
            row.co_authors = await getExperimentAuthors(pool, row.id);
        }
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. History of Experiments (Published or Rejected)
app.get('/api/editor/experiments/history', authenticateToken, async (req, res) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [rows] = await pool.query(`
            SELECT e.*, u.fullname as author_name 
            FROM experiments e
            LEFT JOIN users u ON e.author_id = u.id
            WHERE e.status IN ('published', 'rejected') 
            ORDER BY e.created_at DESC 
            LIMIT 50
        `);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. Decide on Experiment (Approve/Reject)
app.put('/api/editor/experiments/decide/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
    const { decision, rejection_reason } = req.body; // 'approve' or 'reject'
    const experimentId = req.params.id;

    try {
        const [check] = await pool.query('SELECT author_id, title FROM experiments WHERE id = ?', [experimentId]);
        if (check.length === 0) return res.status(404).json({ message: 'Experiment not found' });

        const authorId = check[0].author_id;
        const title = check[0].title;

        if (decision === 'approve') {
            await pool.query(
                "UPDATE experiments SET status = 'published', approved_by = ?, rejection_reason = NULL WHERE id = ?",
                [req.user.id, experimentId]
            );

            // Notify author
            let msg = `Tebrikler! Deneyiniz onaylandı ve yayınlandı: ${title}`;
            await createNotification(authorId, msg, 'success');

        } else if (decision === 'reject') {
            await pool.query(
                "UPDATE experiments SET status = 'rejected', approved_by = ?, rejection_reason = ? WHERE id = ?",
                [req.user.id, rejection_reason, experimentId]
            );

            // Notify author
            let msg = `Deneyiniz reddedildi: ${title}. Sebep: ${rejection_reason || 'Belirtilmedi'}`;
            await createNotification(authorId, msg, 'error');
        } else {
            return res.status(400).json({ error: 'Invalid decision' });
        }

        clearCache('experiments');
        res.json({ message: 'Success' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Editor Decision Endpoint (Approve/Reject)
app.put('/api/editor/decide/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);

    const articleId = req.params.id;
    const { decision, rejection_reason } = req.body; // 'approve' or 'reject'

    try {
        const [rows] = await pool.query('SELECT author_id, title FROM articles WHERE id = ?', [articleId]);
        if (rows.length === 0) return res.status(404).json({ message: 'Article not found' });

        const authorId = rows[0].author_id;
        const title = rows[0].title;

        let status = '';
        let msg = '';
        let type = '';
        let updateQuery = '';
        let queryParams = [];

        if (decision === 'approve') {
            status = 'published';
            msg = `Makaleniz yayına alındı: ${title}`;
            type = 'success';
            updateQuery = "UPDATE articles SET status = 'published', rejection_reason = NULL, created_at = NOW() WHERE id = ?";
            queryParams = [articleId];
        } else if (decision === 'reject') {
            status = 'rejected';
            msg = `Makaleniz reddedildi: ${title}. ${rejection_reason ? 'Sebep: ' + rejection_reason : ''}`;
            type = 'error';
            updateQuery = "UPDATE articles SET status = 'rejected', rejection_reason = ? WHERE id = ?";
            queryParams = [rejection_reason, articleId];
        } else {
            return res.status(400).json({ message: 'Invalid decision' });
        }

        await pool.query(updateQuery, queryParams);

        // Notify Author
        await createNotification(authorId, msg, type);

        // SEO: Ping search engines & send newsletter on approve
        if (decision === 'approve') {
            const [slugRow] = await pool.query('SELECT slug FROM articles WHERE id = ?', [articleId]);
            if (slugRow.length > 0) {
                pingSearchEngines(slugRow[0].slug).catch(err => console.error('[SEO-PING] Error:', err));
            }
            autoSendNewsletter(articleId).catch(err => console.error('[AUTO-NEWSLETTER] Error:', err));
        }

        res.json({ message: `Article ${status}` });

    } catch (e) {
        console.error('Decision Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Soft Delete
app.delete('/api/articles/:id', authenticateToken, async (req, res) => {
    // Owner or Admin
    try {
        const [check] = await pool.query('SELECT author_id FROM articles WHERE id = ?', [req.params.id]);
        if (check.length === 0) return res.status(404).json({ message: 'Not found' });
        if (check[0].author_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);

        await pool.query("UPDATE articles SET status = 'trash' WHERE id = ?", [req.params.id]);
        res.json({ message: 'Moved to trash' });
    } catch (e) {
        console.error('Delete Error:', e);

        // DEBUG: Log deep details to file
        try {
            const fs = require('fs');
            const [dbName] = await pool.query('SELECT DATABASE() as db');
            const [cols] = await pool.query("SHOW COLUMNS FROM articles LIKE 'status'");
            const debugInfo = `
[${new Date().toISOString()}] DELETE ERROR
Error: ${e.message}
Connected DB: ${dbName[0].db}
Column Schema: ${JSON.stringify(cols)}
User: ${req.user.username} (ID: ${req.user.id}, Role: ${req.user.role})
            `;
            fs.appendFileSync('server_debug.log', debugInfo);
        } catch (logErr) {
            console.error('Failed to write debug log:', logErr);
        }

        res.status(500).json({ error: 'Global Server Error', details: e.message });
    }
});

app.delete('/api/articles/permanent/:id', authenticateToken, async (req, res) => {
    const [check] = await pool.query('SELECT author_id FROM articles WHERE id = ?', [req.params.id]);
    if (check.length === 0) return res.status(404).json({ message: 'Not found' });
    if (check[0].author_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);

    await pool.query('DELETE FROM articles WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted permanently' });
});

app.put('/api/articles/restore/:id', authenticateToken, async (req, res) => {
    const [check] = await pool.query('SELECT author_id FROM articles WHERE id = ?', [req.params.id]);
    if (check.length === 0) return res.status(404).json({ message: 'Not found' });
    if (check[0].author_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);

    // Restore to 'draft' to be safe? Or 'pending'? Let's restore to 'draft' so they can resubmit.
    await pool.query("UPDATE articles SET status = 'draft' WHERE id = ?", [req.params.id]);
    res.json({ message: 'Restored to draft' });
});

// [REMOVED DUPLICATE POST /api/articles ROUTE]

// Update Article
app.put('/api/articles/:id', authenticateToken, upload.single('image'), optimizeImageMiddleware, async (req, res) => {
    try {
        const { title, content, category, tags, status } = req.body;
        const articleId = req.params.id;

        // Check ownership
        const [check] = await pool.query('SELECT author_id, image_url FROM articles WHERE id = ?', [articleId]);
        if (check.length === 0) return res.status(404).json({ message: 'Not found' });
        if (check[0].author_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);

        let image_url = check[0].image_url;
        if (req.file) image_url = `/uploads/${req.file.filename}`;

        await pool.query(
            'UPDATE articles SET title = ?, content = ?, category = ?, tags = ?, status = ?, image_url = ?, updated_at = NOW() WHERE id = ?',
            [title, content, category, tags, status, image_url, articleId]
        );

        res.json({ message: 'Article updated' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});



// Author Stats Endpoint
app.get('/api/author/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [published] = await pool.query("SELECT COUNT(*) as count FROM articles WHERE author_id = ? AND status = 'published'", [userId]);
        const [pending] = await pool.query("SELECT COUNT(*) as count FROM articles WHERE author_id = ? AND status = 'pending'", [userId]);

        // Sum views
        const [views] = await pool.query("SELECT SUM(views) as count FROM articles WHERE author_id = ? AND status = 'published'", [userId]);

        // Sum likes
        const [likes] = await pool.query(`
            SELECT COUNT(l.id) as count 
            FROM likes l 
            JOIN articles a ON l.article_id = a.id 
            WHERE a.author_id = ?
        `, [userId]);

        // Sum comments
        const [comments] = await pool.query(`
            SELECT COUNT(c.id) as count 
            FROM comments c 
            JOIN articles a ON c.article_id = a.id 
            WHERE a.author_id = ?
        `, [userId]);

        // Experiment stats
        const [expPublishedRes] = await pool.query("SELECT COUNT(*) as count FROM experiments WHERE author_id = ? AND status = 'published' AND deleted_at IS NULL", [userId]);
        const [expPendingRes] = await pool.query("SELECT COUNT(*) as count FROM experiments WHERE author_id = ? AND status = 'pending' AND deleted_at IS NULL", [userId]);
        const [expViewsRes] = await pool.query("SELECT SUM(views) as count FROM experiments WHERE author_id = ? AND status = 'published' AND deleted_at IS NULL", [userId]);

        res.json({
            published: published[0].count,
            pending: pending[0].count,
            expPublished: expPublishedRes[0].count,
            expPending: expPendingRes[0].count,
            views: Number(views[0].count || 0) + Number(expViewsRes[0].count || 0), // Combined views
            likes: Number(likes[0].count || 0),
            comments: Number(comments[0].count || 0)
        });
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

app.get('/api/author/analytics', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all articles and experiments with their view counts, like counts AND COMMENT counts
        const [items] = await pool.query(`
            SELECT 
                a.id, a.title, a.created_at, a.views, 'article' as type,
                (SELECT COUNT(*) FROM likes WHERE article_id = a.id) as likes,
                (SELECT COUNT(*) FROM comments WHERE article_id = a.id) as comments
            FROM articles a
            WHERE a.author_id = ? AND a.status = 'published'
            UNION ALL
            SELECT 
                e.id, e.title, e.created_at, e.views, 'experiment' as type,
                0 as likes,
                0 as comments
            FROM experiments e
            WHERE e.author_id = ? AND e.status = 'published' AND e.deleted_at IS NULL
            ORDER BY created_at DESC
        `, [userId, userId]);

        // Calculate totals
        let totalViews = 0;
        let totalLikes = 0;
        let totalComments = 0;

        items.forEach(item => {
            totalViews += item.views;
            totalLikes += item.likes;
            totalComments += item.comments;
        });

        res.json({
            totalViews,
            totalLikes,
            totalComments,
            articles: items
        });
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

// Get recent comments for author's articles
app.get('/api/author/comments', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [comments] = await pool.query(`
            SELECT c.*, u.fullname as user_name, a.title as article_title
            FROM comments c
            JOIN articles a ON c.article_id = a.id
            JOIN users u ON c.user_id = u.id
            WHERE a.author_id = ?
            ORDER BY c.created_at DESC
            LIMIT 20
        `, [userId]);
        res.json(comments);
    } catch (e) {
        res.status(500).send(e.toString());
    }
});


// === EDITOR ROUTES ===
app.get('/api/editor/pending-articles', authenticateToken, async (req, res) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [rows] = await pool.query(`
            SELECT a.*, u.fullname as author_name 
            FROM articles a 
            JOIN users u ON a.author_id = u.id 
            WHERE a.status = 'pending' 
            ORDER BY a.created_at ASC
        `);
        res.json(rows);
    } catch (e) { res.status(500).send(e.toString()); }
});

app.get('/api/editor/history', authenticateToken, async (req, res) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [rows] = await pool.query(`
            SELECT a.*, u.fullname as author_name 
            FROM articles a 
            JOIN users u ON a.author_id = u.id 
            WHERE a.status IN ('published', 'rejected')
            ORDER BY a.created_at DESC
        `);
        res.json(rows);
    } catch (e) { res.status(500).send(e.toString()); }
});

app.get('/api/editor/trash', authenticateToken, async (req, res) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [rows] = await pool.query(`
            SELECT a.*, u.fullname as author_name 
            FROM articles a 
            JOIN users u ON a.author_id = u.id 
            WHERE a.status = 'trash' 
            ORDER BY a.created_at DESC
        `);
        res.json(rows);
    } catch (e) { res.status(500).send(e.toString()); }
});

app.put('/api/editor/decide/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
    const { decision, rejection_reason } = req.body; // 'approve' or 'reject'
    const status = decision === 'approve' ? 'published' : 'rejected';
    const reasonValue = decision === 'reject' ? rejection_reason : null;

    // If approving, save who approved it
    let approvedBy = null;
    if (decision === 'approve') approvedBy = req.user.id;

    try {
        await pool.query('UPDATE articles SET status = ?, rejection_reason = ?, approved_by = ? WHERE id = ?', [status, reasonValue, approvedBy, req.params.id]);

        // SEO: Ping search engines & send newsletter on approve
        if (decision === 'approve') {
            const [slugRow] = await pool.query('SELECT slug FROM articles WHERE id = ?', [req.params.id]);
            if (slugRow.length > 0) {
                pingSearchEngines(slugRow[0].slug).catch(err => console.error('[SEO-PING] Error:', err));
            }
            autoSendNewsletter(req.params.id).catch(err => console.error('[AUTO-NEWSLETTER] Error:', err));
        }

        clearCache('articles');
        res.json({ message: `Article ${status}` });
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

app.get('/api/editor/stats', authenticateToken, async (req, res) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
    const { author_id } = req.query;

    try {
        let pendingQ = "SELECT COUNT(*) as count FROM articles WHERE status = 'pending'";
        let publishedQ = "SELECT COUNT(*) as count FROM articles WHERE status = 'published'";
        let rejectedQ = "SELECT COUNT(*) as count FROM articles WHERE status = 'rejected'";
        let viewsQ = "SELECT SUM(views) as count FROM articles";
        let likesQ = "SELECT COUNT(*) as count FROM likes";
        let commentsQ = "SELECT COUNT(*) as count FROM comments";
        let articlesQ = "SELECT articles.id, articles.title, articles.category, articles.status, articles.created_at, articles.views, users.fullname as author_name, (SELECT COUNT(*) FROM likes WHERE article_id = articles.id) as like_count, (SELECT COUNT(*) FROM comments WHERE article_id = articles.id) as comment_count FROM articles LEFT JOIN users ON articles.author_id = users.id WHERE articles.status = 'published'";

        let params = [];
        if (author_id && author_id !== 'all') {
            const aid = parseInt(author_id);
            params = [aid];

            pendingQ += " AND author_id = ?";
            publishedQ += " AND author_id = ?";
            rejectedQ += " AND author_id = ?";
            viewsQ += " WHERE author_id = ?";
            likesQ = "SELECT COUNT(l.id) as count FROM likes l JOIN articles a ON l.article_id = a.id WHERE a.author_id = ?";
            commentsQ = "SELECT COUNT(c.id) as count FROM comments c JOIN articles a ON c.article_id = a.id WHERE a.author_id = ?";
            articlesQ += " AND articles.author_id = ?";
        }

        articlesQ += " ORDER BY created_at DESC";

        const [
            [pendingRows],
            [publishedRows],
            [rejectedRows],
            [viewsRows],
            [likesRows],
            [commentsRows],
            [articlesRows]
        ] = await Promise.all([
            pool.query(pendingQ, params),
            pool.query(publishedQ, params),
            pool.query(rejectedQ, params),
            pool.query(viewsQ, params),
            pool.query(likesQ, params),
            pool.query(commentsQ, params),
            pool.query(articlesQ, params)
        ]);

        res.json({
            pending: pendingRows[0].count,
            published: publishedRows[0].count,
            rejected: rejectedRows[0].count,
            total_views: viewsRows[0].count || 0,
            total_likes: likesRows[0].count || 0,
            total_comments: commentsRows[0].count || 0,
            articles: articlesRows
        });
    } catch (e) { res.status(500).send(e.toString()); }
});

app.get('/api/editor/authors', authenticateToken, async (req, res) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [authors] = await pool.query("SELECT id, fullname, avatar_url FROM users WHERE role = 'author'");
        res.json(authors);
    } catch (e) { res.status(500).send(e.toString()); }
});


// === YAZAR TAKİP (TRACKED AUTHORS) ROUTES ===

// GET all tracked authors with their articles
app.get('/api/tracked-authors', authenticateToken, async (req, res) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [authors] = await pool.query(`
            SELECT ta.*, u.fullname as created_by_name
            FROM tracked_authors ta
            LEFT JOIN users u ON ta.created_by = u.id
            ORDER BY ta.created_at DESC
        `);

        // Fetch articles for each author
        for (let author of authors) {
            const [articles] = await pool.query(
                'SELECT * FROM tracked_author_articles WHERE author_id = ? ORDER BY article_date DESC',
                [author.id]
            );
            author.articles = articles;
        }

        res.json(authors);
    } catch (e) {
        console.error('Tracked authors fetch error:', e);
        res.status(500).json({ error: e.toString() });
    }
});

// POST create new tracked author
app.post('/api/tracked-authors', authenticateToken, async (req, res) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const { first_name, last_name, phone, university, frequency, conversation_date, notes, violations, user_id } = req.body;

        if (!first_name || !last_name || !frequency || !conversation_date) {
            return res.status(400).json({ error: 'Zorunlu alanlar eksik: first_name, last_name, frequency, conversation_date' });
        }

        const [result] = await pool.query(
            `INSERT INTO tracked_authors (first_name, last_name, phone, university, frequency, conversation_date, notes, created_by, violations, user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [first_name, last_name, phone || null, university || null, parseInt(frequency), conversation_date, notes || null, req.user.id, parseInt(violations) || 0, user_id || null]
        );

        res.status(201).json({ id: result.insertId, message: `${first_name} ${last_name} başarıyla eklendi.` });
    } catch (e) {
        console.error('Tracked author create error:', e);
        res.status(500).json({ error: e.toString() });
    }
});

// PUT update tracked author
app.put('/api/tracked-authors/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const { first_name, last_name, phone, university, frequency, conversation_date, notes, violations, user_id } = req.body;
        const authorId = req.params.id;

        if (!first_name || !last_name || !frequency || !conversation_date) {
            return res.status(400).json({ error: 'Zorunlu alanlar eksik.' });
        }

        const [result] = await pool.query(
            `UPDATE tracked_authors SET first_name = ?, last_name = ?, phone = ?, university = ?, frequency = ?, conversation_date = ?, notes = ?, violations = ?, user_id = ?
             WHERE id = ?`,
            [first_name, last_name, phone || null, university || null, parseInt(frequency), conversation_date, notes || null, parseInt(violations) || 0, user_id || null, authorId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Yazar bulunamadı.' });
        }

        res.json({ message: `${first_name} ${last_name} güncellendi.` });
    } catch (e) {
        console.error('Tracked author update error:', e);
        res.status(500).json({ error: e.toString() });
    }
});

// DELETE tracked author
app.delete('/api/tracked-authors/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [result] = await pool.query('DELETE FROM tracked_authors WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Yazar bulunamadı.' });
        }

        res.json({ message: 'Yazar silindi.' });
    } catch (e) {
        console.error('Tracked author delete error:', e);
        res.status(500).json({ error: e.toString() });
    }
});

// GET authors list for dropdown (Editors only)
app.get('/api/users/authors', authenticateToken, async (req, res) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [authors] = await pool.query('SELECT id, fullname, email FROM users WHERE role = "author" ORDER BY fullname ASC');
        res.json(authors);
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// GET author tracking status (for the logged in author)
app.get('/api/author/tracking-status', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM tracked_authors WHERE user_id = ?', [req.user.id]);
        if (rows.length === 0) {
            return res.json({ tracked: false });
        }
        const tracking = rows[0];
        
        // Calculate days left
        const lastDate = new Date(tracking.conversation_date);
        const today = new Date();
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + tracking.frequency);
        
        // Difference in ms, then convert to days
        const diffMs = nextDate - today;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        
        res.json({
            tracked: true,
            university: tracking.university,
            frequency: tracking.frequency,
            last_conversation: tracking.conversation_date,
            next_deadline: nextDate.toISOString(),
            days_left: diffDays,
            violations: tracking.violations
        });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// POST record article for tracked author
app.post('/api/tracked-authors/:id/articles', authenticateToken, async (req, res) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const { title, article_date } = req.body;
        const authorId = req.params.id;

        if (!title || !article_date) {
            return res.status(400).json({ error: 'Makale başlığı ve tarihi gerekli.' });
        }

        // Verify author exists and fetch their details
        const [authors] = await pool.query('SELECT * FROM tracked_authors WHERE id = ?', [authorId]);
        if (authors.length === 0) {
            return res.status(404).json({ error: 'Yazar bulunamadı.' });
        }
        const author = authors[0];

        // Fetch their most recent article date before this new one
        const [articles] = await pool.query(
            'SELECT article_date FROM tracked_author_articles WHERE author_id = ? ORDER BY article_date DESC LIMIT 1',
            [authorId]
        );

        // Determine reference date (MAX of conversation_date and last article date)
        let referenceDate = new Date(author.conversation_date);
        if (articles.length > 0) {
            const lastArticleDate = new Date(articles[0].article_date);
            if (lastArticleDate > referenceDate) {
                referenceDate = lastArticleDate;
            }
        }
        referenceDate.setHours(0, 0, 0, 0);

        // Calculate deadline
        const deadlineDays = parseInt(author.frequency);
        const deadlineDate = new Date(referenceDate);
        deadlineDate.setDate(deadlineDate.getDate() + deadlineDays);
        deadlineDate.setHours(0, 0, 0, 0);

        // Compare new article date with deadline
        const newArticleDate = new Date(article_date);
        newArticleDate.setHours(0, 0, 0, 0);

        let violation = false;
        if (newArticleDate > deadlineDate) {
            violation = true;
            // Increment violation count in database
            await pool.query('UPDATE tracked_authors SET violations = violations + 1 WHERE id = ?', [authorId]);
        }

        // Insert new article
        const [result] = await pool.query(
            'INSERT INTO tracked_author_articles (author_id, title, article_date) VALUES (?, ?, ?)',
            [authorId, title, article_date]
        );

        res.status(201).json({
            id: result.insertId,
            message: `"${title}" kaydedildi.` + (violation ? ' ⚠️ Gecikme nedeniyle 1 ihlal eklendi!' : ''),
            violation: violation
        });
    } catch (e) {
        console.error('Tracked author article create error:', e);
        res.status(500).json({ error: e.toString() });
    }
});


// 2. Hero Slides
app.get('/api/hero-slides', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM hero_slides ORDER BY id DESC');
        res.json(rows);
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

app.post('/api/hero-slides', authenticateToken, upload.single('image'), optimizeImageMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    if (!req.file) return res.status(400).json({ message: 'No image file' });

    try {
        const imageUrl = 'uploads/' + req.file.filename;
        await pool.query('INSERT INTO hero_slides (image_url) VALUES (?)', [imageUrl]);
        res.json({ message: 'Slide added' });
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

app.delete('/api/hero-slides/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        await pool.query('DELETE FROM hero_slides WHERE id = ?', [req.params.id]);
        res.json({ message: 'Slide deleted' });
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

// User Auth/* === PASSWORD RESET FLOW === */

// 1. Forgot Password Request
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'E-posta adresi gerekli.' });

    // Dynamic Logo URL based on current host
    const logoUrl = `${req.protocol}://${req.get('host')}/uploads/logo.png`;

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.json({ message: 'Eğer bu e-posta kayıtlıysa, sıfırlama bağlantısı gönderildi.' });
        }

        const user = users[0];
        // Generate Token
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hour from now

        await pool.query('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [token, expires, user.id]);

        const resetLink = `https://${req.get('host')}/index.html?modal=reset-password&token=${token}`;

        // Send Email via Helper
        const resetSubject = "AperionX Şifre Sıfırlama Talebi";
        const resetBody = `
            <h2>Merhaba ${user.fullname || 'Kullanıcı'},</h2>
            <p>Hesabınız için bir şifre sıfırlama talebi aldık. Eğer bu işlemi siz yapmadıysanız, bu maili dikkate almayınız.</p>
            <p>Şifrenizi yenilemek için aşağıdaki butona tıklayın:</p>
            <br>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="display:inline-block; padding:12px 24px; background-color:#6366F1; color:white; text-decoration:none; border-radius:8px; font-weight:bold; font-size:16px;">Şifremi Sıfırla</a>
            </div>
            <p style="font-size:12px; color:#999;">Link çalışmıyorsa: <a href="${resetLink}">${resetLink}</a></p>
        `;

        await sendDynamicEmail(email, 'custom', resetBody, resetSubject);

        console.log(`[DEV] Password Reset Link (Backup Log) for ${email}: ${resetLink}`);

        res.json({ message: 'Sıfırlama bağlantısı e-posta adresinize gönderildi.' });

    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ message: 'E-posta gönderilemedi: ' + (error.message || 'Bilinmeyen sunucu hatası') });
    }
});

// 2. Reset Password
app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: 'Token ve yeni şifre gerekli.' });

    try {
        // Validate Token
        const [users] = await pool.query('SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()', [token]);

        if (users.length === 0) {
            return res.status(400).json({ message: 'Geçersiz veya süresi dolmuş bağlantı.' });
        }

        const user = users[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.query('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [hashedPassword, user.id]);

        res.json({ message: 'Şifreniz başarıyla güncellendi. Giriş yapabilirsiniz.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
});
// === USER PROFILE ROUTES ===
app.get('/api/user/liked-articles', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const query = `
            SELECT a.id, a.title, a.category, a.image_url, l.created_at as liked_at
            FROM articles a
            JOIN likes l ON a.id = l.article_id
            WHERE l.user_id = ? AND a.status = 'published'
            ORDER BY l.created_at DESC
        `;
        const [rows] = await pool.query(query, [userId]);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Database error' });
    }
});

app.get('/api/user/comments', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const query = `
            SELECT c.id, c.content, c.is_approved, c.created_at, c.article_id, a.title as article_title,
                   c.experiment_id, e.title as experiment_title, e.slug as experiment_slug
            FROM comments c
            LEFT JOIN articles a ON c.article_id = a.id
            LEFT JOIN experiments e ON c.experiment_id = e.id
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC
        `;
        const [rows] = await pool.query(query, [userId]);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Database error' });
    }
});

// User Auth Routes
app.post('/api/register', async (req, res) => {
    const { fullname, email, username, password } = req.body;
    try {
        // Validate Username uniqueness if provided

        if (username) {
            const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
            if (existing.length > 0) return res.status(400).json({ message: 'Bu kullanıcı adı zaten alınmış.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (fullname, email, username, password, role) VALUES (?, ?, ?, ?, ?)', [fullname, email, username || null, hashedPassword, 'reader']);

        // Send Welcome Email
        try {
            const welcomeTitle = "AperionX Ailesine Hoş Geldiniz! 🚀";
            const welcomeBody = `
                <h2>Merhaba ${fullname},</h2>
                <p>AperionX ailesine katıldığınız için çok mutluyuz! Bilim ve teknolojinin sınırlarını zorlayan bu yolculukta sizinle beraber olmak harika.</p>
                <p>Hesabınızla giriş yaparak makaleleri okuyabilir, yorum yapabilir ve kendi içeriklerinizi oluşturabilirsiniz.</p>
                <br>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://aperionx.com" style="display:inline-block; padding:12px 24px; background-color:#6366F1; color:white; text-decoration:none; border-radius:8px; font-weight:bold; font-size:16px;">AperionX'i Keşfet</a>
                </div>
            `;
            // Retrieve latest settings for SMTP
            console.log(`[Register] Sending welcome email to ${email}...`);
            await sendDynamicEmail(email, 'custom', welcomeBody, welcomeTitle);
            console.log(`[Register] Welcome email sent.`);
        } catch (emailErr) {
            console.error('Welcome Email Failed:', emailErr);
        }

        // Send Welcome Email (Legacy / Duplicate removal if needed, but keeping this block clean)
        // const logoUrl ... (Removing old commented out or placeholder logic if any)

        res.status(201).json({ message: 'User registered' });
    } catch (error) {
        console.error('Register Error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Bu e-posta veya kullanıcı adı zaten kullanımda.' });
        }
        res.status(500).json({ message: 'Kayıt sırasında hata: ' + (error.message || 'Sunucu hatası') });
    }
});

app.post('/api/login', async (req, res) => {
    const { identifier, password, rememberMe } = req.body; // 'identifier' is email OR username
    // Backward compatibility: if 'email' is sent instead of 'identifier'
    const loginInput = identifier || req.body.email;

    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ? OR username = ?', [loginInput, loginInput]);
        if (rows.length === 0) return res.status(400).json({ message: 'User not found' });

        const user = rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ message: 'Invalid password' });

        const tokenExpiry = rememberMe ? '30d' : '24h';
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: tokenExpiry });

        let redirectUrl = 'index.html';
        if (user.role === 'admin') redirectUrl = 'admin';
        else if (user.role === 'author') redirectUrl = 'author';
        else if (user.role === 'editor') redirectUrl = 'editor';
        else if (user.role === 'reader') redirectUrl = 'index.html';

        res.json({
            token,
            user: {
                id: user.id,
                fullname: user.fullname,
                email: user.email,
                username: user.username,
                role: user.role,
                avatar_url: user.avatar_url,
                bio: user.bio,
                job_title: user.job_title
            },
            redirectUrl
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası oluştu.' });
    }
});

// Google OAuth Login
app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body;
    
    if (!credential) {
        return res.status(400).json({ message: 'Google token gerekli.' });
    }

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        const { email, name, picture } = payload;
        
        // Kullanıcı var mı kontrol et
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        let user;
        
        if (rows.length === 0) {
            // Kullanıcı yoksa oluştur
            const username = email.split('@')[0] + Math.floor(Math.random() * 1000);
            // Rastgele güvenli bir şifre ata (Google ile girdiği için şifre bilmesine gerek yok ama db kısıtlaması için lazım)
            const randomPassword = require('crypto').randomBytes(16).toString('hex');
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            
            const [result] = await pool.query(
                'INSERT INTO users (fullname, email, username, password, role, avatar_url) VALUES (?, ?, ?, ?, ?, ?)', 
                [name, email, username, hashedPassword, 'reader', picture]
            );
            
            user = {
                id: result.insertId,
                fullname: name,
                email: email,
                username: username,
                role: 'reader',
                avatar_url: picture,
                bio: null,
                job_title: null
            };
        } else {
            user = rows[0];
            // Eğer profil resmi yoksa Google'dan alalım
            if (!user.avatar_url || user.avatar_url === '') {
                await pool.query('UPDATE users SET avatar_url = ? WHERE id = ?', [picture, user.id]);
                user.avatar_url = picture;
            }
        }
        
        // Token oluştur (Google girişleri için varsayılan 30 gün verebiliriz veya standart 24h)
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
        
        let redirectUrl = 'index.html';
        if (user.role === 'admin') redirectUrl = 'admin';
        else if (user.role === 'author') redirectUrl = 'author';
        else if (user.role === 'editor') redirectUrl = 'editor';
        else if (user.role === 'reader') redirectUrl = 'index.html';

        res.json({
            token,
            user: {
                id: user.id,
                fullname: user.fullname,
                email: user.email,
                username: user.username,
                role: user.role,
                avatar_url: user.avatar_url,
                bio: user.bio,
                job_title: user.job_title
            },
            redirectUrl
        });

    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(500).json({ message: 'Google doğrulama hatası.' });
    }
});

// GET endpoint for Google OAuth Redirect (Full Page Flow)
console.log('[ROUTE REGISTER] /api/auth/google/callback GET route is being registered NOW');
app.get('/api/auth/google/callback', async (req, res) => {
    console.log('[GOOGLE CALLBACK] Route HIT! code=' + (req.query.code ? 'present' : 'missing'));
    const code = req.query.code;
    if (!code) {
        return res.status(400).json({ message: 'Yetkilendirme kodu eksik.' });
    }
    
    try {
        const axios = require('axios');
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: 'https://www.aperionx.com/api/auth/google/callback'
        });
        
        const { id_token } = tokenResponse.data;
        
        const ticket = await googleClient.verifyIdToken({
            idToken: id_token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        const { email, name, picture } = payload;
        
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        let user;
        
        if (rows.length === 0) {
            const username = email.split('@')[0] + Math.floor(Math.random() * 1000);
            const randomPassword = require('crypto').randomBytes(16).toString('hex');
            // using global bcryptjs
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            
            const [result] = await pool.query(
                'INSERT INTO users (fullname, email, username, password, role, avatar_url) VALUES (?, ?, ?, ?, ?, ?)', 
                [name, email, username, hashedPassword, 'reader', picture]
            );
            
            user = { id: result.insertId, fullname: name, email, username, role: 'reader', avatar_url: picture, bio: null, job_title: null };
        } else {
            user = rows[0];
            if (!user.avatar_url || user.avatar_url === '') {
                await pool.query('UPDATE users SET avatar_url = ? WHERE id = ?', [picture, user.id]);
                user.avatar_url = picture;
            }
        }
        
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
        
        // Return HTML that saves token to localStorage and redirects
        const html = `
        <!DOCTYPE html>
        <html>
            <head>
                <title>Giriş Yapılıyor...</title>
                <style>
                    body { background: #1a1b26; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; }
                </style>
            </head>
            <body>
                <h2>Başarıyla Giriş Yapıldı, Yönlendiriliyorsunuz...</h2>
                <script>
                    localStorage.setItem('token', '${token}');
                    localStorage.setItem('user', JSON.stringify(${JSON.stringify({ 
                        id: user.id, 
                        fullname: user.fullname, 
                        email: user.email, 
                        username: user.username, 
                        role: user.role, 
                        avatar_url: user.avatar_url,
                        bio: user.bio,
                        job_title: user.job_title
                    })}));
                    window.location.href = '/';
                </script>
            </body>
        </html>
        `;
        res.send(html);
        
    } catch (error) {
        console.error('Google callback error:', error);
        res.status(500).json({ message: 'Google doğrulama hatası', error: error.message });
    }
});

// NEW: Validate Token / Get Current User
app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, fullname, username, email, role, avatar_url, bio, job_title FROM users WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
        // script_v105.js expects the response to be the user object directly: `const user = await res.json();`
        // We will return the user object directly, but also include `{ user: ... }` wrapper just in case other scripts expect it.
        // Wait, script_v105.js does `const user = await res.json(); user.fullname...`. It expects the user object at the root.
        res.json({
            ...rows[0],
            user: rows[0] // Backward compatibility for scripts expecting data.user
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
});

// Public: Get all published articles with filters
app.get('/api/articles', async (req, res) => {
    try {
        const { category, search, page = 1, limit = 9 } = req.query;
        // Truncate excerpt to avoid huge packet sizes if it contains full content
        let query = `
            SELECT a.id, a.slug, a.title, a.category, u.fullname as author_name, a.author_id, a.image_url, a.created_at, a.views, LEFT(a.excerpt, 300) as excerpt 
            FROM articles a
            LEFT JOIN users u ON a.author_id = u.id
            WHERE a.status = 'published'
        `;
        const params = [];

        if (category && category !== 'all') {
            query += " AND a.category = ?";
            params.push(category);
        }

        if (search) {
            query += " AND (a.title LIKE ? OR a.content LIKE ?)";
            params.push(`%${search}%`, `%${search}%`);
        }

        query += " ORDER BY a.created_at DESC";

        const [results] = await pool.query(query, params);
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Public: Get Single Article by ID
app.get('/api/articles/:id', async (req, res) => {
    try {
        // Disable caching to ensure view counts are always processed
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        const param = req.params.id;

        let query = `
             SELECT a.*, u.fullname as author_name, u.avatar_url as author_avatar
             FROM articles a 
             LEFT JOIN users u ON a.author_id = u.id 
             WHERE a.status = 'published' AND `;

        const sqlParams = [];

        // Check if param is numeric (ID) or string (Slug)
        // Basic check: if it contains only digits, assume ID (unless slug is also digits, unlikely)
        if (/^\d+$/.test(param)) {
            query += "a.id = ?";
            sqlParams.push(param);
        } else {
            query += "a.slug = ?";
            sqlParams.push(param);
        }

        const [rows] = await pool.query(query, sqlParams);


        if (rows.length === 0) {
            return res.status(404).json({ error: 'Makale bulunamadı veya yayında değil.' });
        }

        // View counting is handled by the SSR /makale/:slug route only
        // No view increment here to prevent double counting

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// DEBUG: Check IP Address
app.get('/api/debug-ip', (req, res) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    res.json({
        reqIP: req.ip, // Express resolved IP
        computedIP: ip,
        remoteAddress: req.socket.remoteAddress,
        xForwardedFor: req.headers['x-forwarded-for'],
        headers: req.headers
    });
});

// Clean URLs
app.get('/admin', (req, res) => {
    res.sendFile('admin.html', { root: path.join(__dirname, 'views') });
});

app.get('/author', (req, res) => {
    res.sendFile('author.html', { root: path.join(__dirname, 'views') });
});

app.get('/author_v2', (req, res) => {
    res.sendFile('author_v2.html', { root: path.join(__dirname, 'views') });
});

app.get('/editor', (req, res) => {
    console.log('Serving editor_panel.html');
    res.set('Cache-Control', 'no-store');
    res.sendFile('editor_panel.html', { root: path.join(__dirname, 'views') });
});

// === CATEGORIES MANAGEMENT ===
app.get('/api/experiments/categories', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT DISTINCT category AS name FROM experiments WHERE status = 'published' AND category IS NOT NULL AND category != '' ORDER BY category ASC");
        res.json(rows);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT DISTINCT category AS name FROM articles WHERE status = 'published' AND category IS NOT NULL AND category != '' ORDER BY category ASC");
        res.json(rows);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.post('/api/categories', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Category name is required' });

    try {
        // Check if exists
        const [existing] = await pool.query('SELECT * FROM categories WHERE name = ?', [name]);
        if (existing.length > 0) return res.status(400).json({ message: 'Category already exists' });

        await pool.query('INSERT INTO categories (name) VALUES (?)', [name]);
        res.json({ message: 'Category added' });
    } catch (e) {
        console.error('DEBUG: Category Error:', e);
        res.status(500).json({ message: e.message });
    }
});

app.delete('/api/categories/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
        res.json({ message: 'Category deleted' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.put('/api/categories/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Category name is required' });

    try {
        // Check if exists (other than self)
        const [existing] = await pool.query('SELECT * FROM categories WHERE name = ? AND id != ?', [name, req.params.id]);
        if (existing.length > 0) return res.status(400).json({ message: 'Category already exists' });

        await pool.query('UPDATE categories SET name = ? WHERE id = ?', [name, req.params.id]);
        res.json({ message: 'Category updated' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});


// === USER PROFILE UPDATE ===
app.put('/api/profile', authenticateToken, upload.single('avatar'), optimizeImageMiddleware, async (req, res) => {
    const { fullname, email, password, bio, job_title } = req.body;
    const userId = req.user.id;

    try {
        let query = 'UPDATE users SET fullname = ?, email = ?';
        let params = [fullname, email];

        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ', password = ?';
            params.push(hashedPassword);
        }

        if (bio !== undefined) {
            query += ', bio = ?';
            params.push(bio);
        }

        if (job_title !== undefined) {
            query += ', job_title = ?';
            params.push(job_title);
        }

        if (req.file) {
            query += ', avatar_url = ?';
            params.push('uploads/' + req.file.filename);
        }

        query += ' WHERE id = ?';
        params.push(userId);

        await pool.query(query, params);

        // Fetch updated user to update local storage on client
        const [rows] = await pool.query('SELECT id, fullname, email, role, avatar_url, bio, job_title FROM users WHERE id = ?', [userId]);

        res.json({ message: 'Profil güncellendi', user: rows[0] });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Profil güncellenemedi: ' + e.message });
    }
});


// Admin: Get All Articles
// Admin: Get All Articles
app.get('/api/admin/all-articles', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [rows] = await pool.query(`
            SELECT a.id, a.title, a.status, a.created_at, 
                   u.fullname as author_name,
                   u2.fullname as approver_name
            FROM articles a
            LEFT JOIN users u ON a.author_id = u.id
            LEFT JOIN users u2 ON a.approved_by = u2.id
            ORDER BY a.created_at DESC
        `);
        res.json(rows);
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

// Admin: Get Monthly Top Articles
app.get('/api/admin/top-articles', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);
    try {
        const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const limit = parseInt(req.query.limit) || 10;

        // Calculate start and end dates
        const startDate = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
        let nextMonth = month + 1;
        let nextYear = year;
        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear += 1;
        }
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01 00:00:00`;

        const query = `
            SELECT a.id, a.title, a.slug, COUNT(v.id) as view_count, u.fullname as author_name
            FROM article_views v
            JOIN articles a ON v.article_id = a.id
            LEFT JOIN users u ON a.author_id = u.id
            WHERE v.viewed_at >= ? AND v.viewed_at < ?
            GROUP BY a.id, a.title, a.slug, u.fullname
            ORDER BY view_count DESC
            LIMIT ?
        `;

        const [rows] = await pool.query(query, [startDate, endDate, limit]);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Admin: Get All Users
app.get('/api/admin/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [rows] = await pool.query('SELECT id, fullname, email, role, created_at FROM users ORDER BY created_at DESC');
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// === EXPERIMENT STATS ENDPOINT (DISABLED - returns zeroes) ===
app.get('/api/experiment-stats', (req, res) => {
    res.json({ published_count: 0, total_views: 0, pending_count: 0, total_count: 0 });
});

// Admin: Create User
app.post('/api/admin/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { fullname, email, password, role } = req.body;
    if (!fullname || !email || !password || !role) return res.status(400).json({ error: 'Tüm alanlar zorunludur' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Generate a username from email
        const username = email.split('@')[0] + Math.floor(Math.random() * 1000);

        await pool.query('INSERT INTO users (fullname, email, password, role, username) VALUES (?, ?, ?, ?, ?)',
            [fullname, email, hashedPassword, role, username]);

        res.sendStatus(201);
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Bu e-posta veya kullanıcı adı zaten kayıtlı.' });
        res.status(500).json({ error: e.message });
    }
});

// Admin: Delete User
app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.sendStatus(200);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Admin: Get Dashboard Stats
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    console.log('[DEBUG] /api/admin/stats CALLED');
    try {
        const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
        const [articles] = await pool.query("SELECT COUNT(*) as count FROM articles WHERE status = 'published'"); // Published articles only

        // Views: Only from published articles
        const [views] = await pool.query("SELECT SUM(views) as count FROM articles WHERE status = 'published'");

        const [likes] = await pool.query('SELECT COUNT(*) as count FROM likes');
        const [comments] = await pool.query('SELECT COUNT(*) as count FROM comments');

        res.json({
            users: users[0].count,
            articles: articles[0].count,
            views: views[0].count || 0,
            likes: likes[0].count,
            comments: comments[0].count
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Admin: Get Chart Data
app.get('/api/admin/chart-data', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        // 1. Daily Views (Last 7 Days) - Published Only
        const [viewsRows] = await pool.query(`
            SELECT DATE(v.viewed_at) as date, COUNT(*) as count 
            FROM article_views v
            JOIN articles a ON v.article_id = a.id
            WHERE a.status = 'published' AND v.viewed_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) 
            GROUP BY DATE(v.viewed_at) 
            ORDER BY date ASC
        `);

        // 2. User Growth (Last 7 Days)
        const [usersRows] = await pool.query(`
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM users 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) 
            GROUP BY DATE(created_at) 
            ORDER BY date ASC
        `);


        // Helper to fill missing dates with 0
        const getLast7Days = () => {
            const days = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                days.push(d.toISOString().split('T')[0]);
            }
            return days;
        };

        const fillData = (rows) => {
            const days = getLast7Days();
            return days.map(date => {
                const found = rows.find(r => {
                    const rDate = new Date(r.date).toISOString().split('T')[0];
                    return rDate === date;
                });
                return { date, count: found ? found.count : 0 };
            });
        };

        // 3. Monthly Calculated Stats (Last 30 Days) - Published Only
        const [mViews] = await pool.query(`
            SELECT COUNT(*) as count 
            FROM article_views v 
            JOIN articles a ON v.article_id = a.id 
            WHERE a.status = 'published' AND v.viewed_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `);

        const [mLikes] = await pool.query('SELECT COUNT(*) as count FROM likes WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)');
        const [mComments] = await pool.query('SELECT COUNT(*) as count FROM comments WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)');
        const [mUsers] = await pool.query('SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)');
        const [mArticles] = await pool.query("SELECT COUNT(*) as count FROM articles WHERE status='published' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)");

        // 4. Historical Data (Monthly) - Fetch last 12 months
        // Helper to format Date to YYYY-MM
        const getMonthGroups = async (table, dateCol) => {
            // Generic fallback for non-article tables
            const [rows] = await pool.query(`SELECT DATE_FORMAT(${dateCol}, '%Y-%m') as month, COUNT(*) as count FROM ${table} GROUP BY month ORDER BY month DESC LIMIT 12`);
            return rows;
        };

        // Specific for views to filter published
        const getViewMonthGroups = async () => {
            const [rows] = await pool.query(`
                SELECT DATE_FORMAT(v.viewed_at, '%Y-%m') as month, COUNT(*) as count 
                FROM article_views v
                JOIN articles a ON v.article_id = a.id
                WHERE a.status = 'published'
                GROUP BY month ORDER BY month DESC LIMIT 12
            `);
            return rows;
        };

        // Articles extra condition
        const getArticleMonthGroups = async () => {
            const [rows] = await pool.query(`SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count FROM articles WHERE status='published' GROUP BY month ORDER BY month DESC LIMIT 12`);
            return rows;
        };

        const hViews = await getViewMonthGroups();
        const hLikes = await getMonthGroups('likes', 'created_at');
        const hComments = await getMonthGroups('comments', 'created_at');
        const hUsers = await getMonthGroups('users', 'created_at');
        const hArticles = await getArticleMonthGroups();

        // Merge History
        const allMonths = new Set([
            ...hViews.map(r => r.month), ...hLikes.map(r => r.month),
            ...hComments.map(r => r.month), ...hUsers.map(r => r.month),
            ...hArticles.map(r => r.month)
        ]);
        const sortedMonths = Array.from(allMonths).sort().reverse().slice(0, 12);

        const monthlyHistory = sortedMonths.map(m => ({
            month: m,
            views: (hViews.find(r => r.month === m) || {}).count || 0,
            likes: (hLikes.find(r => r.month === m) || {}).count || 0,
            comments: (hComments.find(r => r.month === m) || {}).count || 0,
            users: (hUsers.find(r => r.month === m) || {}).count || 0,
            articles: (hArticles.find(r => r.month === m) || {}).count || 0
        }));

        res.json({
            views: fillData(viewsRows),
            users: fillData(usersRows),
            monthlyStats: {
                views: mViews[0].count,
                likes: mLikes[0].count,
                comments: mComments[0].count,
                users: mUsers[0].count,
                articles: mArticles[0].count
            },
            monthlyHistory
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});



// === SITE SETTINGS ===
app.get('/api/settings_v2', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM site_settings');
        const settings = {};
        rows.forEach(r => settings[r.setting_key] = r.setting_value);
        // Safety Fallback
        if (!settings.site_title) settings.site_title = "AperionX";

        res.json(settings);
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

app.post('/api/settings_v2', authenticateToken, (req, res, next) => {
    upload.fields([
        { name: 'site_logo', maxCount: 1 },
        { name: 'site_favicon', maxCount: 1 }
    ])(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: 'Upload failed: ' + err.message });
        }
        next();
    });
}, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const updates = [];

        // Safety check
        const body = req.body || {};

        // Handle uploaded files
        if (req.files) {
            if (req.files['site_logo']) {
                updates.push({ key: 'site_logo', value: 'uploads/' + req.files['site_logo'][0].filename });
            }
            if (req.files['site_favicon']) {
                updates.push({ key: 'site_favicon', value: 'uploads/' + req.files['site_favicon'][0].filename });
            }
        }

        // Handle text fields
        for (const [key, value] of Object.entries(body)) {
            if (value !== undefined) {
                updates.push({ key, value });
            }
        }

        // Upsert logic
        for (const item of updates) {
            await pool.query('INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', [item.key, item.value, item.value]);
        }

        res.json({ message: 'Settings updated successfully' });
    } catch (e) {
        console.error('Settings Update Error:', e);
        res.status(500).send(e.stack || e.toString());
    }
});

// Serve Admin Panel
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// Serve Author Panel
app.get('/author', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'author.html'));
});

// Serve Editor Panel (DUPLICATE REMOVED - primary route at line ~2762)
// app.get('/editor', ...) -> already defined above serving editor_panel.html

// === PUBLIC AUTHOR PROFILE (Username or ID) ===
app.get('/api/public/author/:identifier', async (req, res) => {
    const { identifier } = req.params;
    console.log('[API] Fetching public author profile for:', identifier);

    try {
        let user;
        // 1. Try by Username
        const [byUsername] = await pool.query('SELECT id, fullname, bio, job_title, avatar_url, username FROM users WHERE username = ?', [identifier]);
        if (byUsername.length > 0) {
            user = byUsername[0];
        } else {
            // 2. Try by ID (Fallback)
            if (!isNaN(identifier)) {
                const [byId] = await pool.query('SELECT id, fullname, bio, job_title, avatar_url, username FROM users WHERE id = ?', [identifier]);
                if (byId.length > 0) user = byId[0];
            }
        }

        if (!user) {
            console.log('[API] Author not found:', identifier);
            return res.status(404).json({ message: 'Author not found' });
        }

        // 3. Fetch Articles (Main author or co-author)
        const [articles] = await pool.query(`
            SELECT DISTINCT a.id, a.title, a.slug, a.image_url, a.excerpt, a.created_at, a.category, a.views, 'article' as type
            FROM articles a
            LEFT JOIN article_authors aa ON a.id = aa.article_id
            WHERE (a.author_id = ? OR aa.user_id = ?) AND a.status = 'published'
            ORDER BY a.created_at DESC
        `, [user.id, user.id]);

        // Experiments removed - only return articles
        res.json({ profile: user, articles: articles });

    } catch (e) {
        console.error('[API] Public Author Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Helper: Ensure Usernames are Populated
async function ensureUsernameMigration() {
    try {
        const [users] = await pool.query("SELECT id, fullname FROM users WHERE username IS NULL OR username = ''");
        if (users.length > 0) {
            console.log(`[MIGRATION] Found ${users.length} users without username. Backfilling...`);
            for (const u of users) {
                let baseSlug = slugify(u.fullname, { lower: true, strict: true });
                if (!baseSlug) baseSlug = 'user';

                let uniqueSlug = baseSlug;
                let counter = 1;
                while (true) {
                    const [check] = await pool.query('SELECT id FROM users WHERE username = ?', [uniqueSlug]);
                    if (check.length === 0) break;
                    uniqueSlug = `${baseSlug}-${counter}`;
                    counter++;
                }

                await pool.query('UPDATE users SET username = ? WHERE id = ?', [uniqueSlug, u.id]);
                console.log(`[MIGRATION] Assigned username '${uniqueSlug}' to User ID ${u.id}`);
            }
        }
    } catch (e) {
        console.error('[MIGRATION] Username Backfill Error:', e);
    }
}
// Call migration on startup
setTimeout(ensureUsernameMigration, 5000); // Delay slightly to ensure DB connection

// SEO-Friendly Article URLs with View Counting
app.get('/makale/:slug', async (req, res) => {
    console.log('[SLUG-ROUTE] Called with slug:', req.params.slug);
    const filePath = path.join(__dirname, 'views', 'article-detail.html');
    const slug = req.params.slug;

    try {
        console.log('[SLUG-ROUTE] Fetching article from DB...');
        // Fetch article by slug
        const [rows] = await pool.query(
            `SELECT a.*, u.fullname as author_name 
             FROM articles a 
             LEFT JOIN users u ON a.author_id = u.id 
             WHERE a.slug = ? AND a.status = 'published'`,
            [slug]
        );

        console.log('[SLUG-ROUTE] Query returned', rows.length, 'rows');

        if (rows.length === 0) {
            console.log('[SLUG-ROUTE] No article found for slug:', slug);
            return res.status(404).sendFile(filePath);
        }

        const article = rows[0];
        const articleId = article.id;
        console.log('[SLUG-ROUTE] Found article ID:', articleId, 'Title:', article.title);

        // View counting is handled by the primary SSR /makale/:slug route at the top of the file
        // No view increment here to prevent double counting
        console.log('[SLUG-ROUTE] Skipping view count (handled by primary route)');

        // SEO Meta Tag Injection
        console.log('[SLUG-ROUTE] Injecting SEO meta tags...');
        let html = fs.readFileSync(filePath, 'utf8');

        const title = article.title + ' - AperionX';
        const desc = article.excerpt || article.title;
        const img = article.image_url ?
            (article.image_url.startsWith('http') ? article.image_url : `${req.protocol}://${req.get('host')}/${article.image_url.replace(/\\/g, '/')}`)
            : `${req.protocol}://${req.get('host')}/uploads/logo.png`;
        const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

        html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
            .replace(/property="og:title" content=".*?"/, `property="og:title" content="${title}"`)
            .replace(/property="og:description" content=".*?"/, `property="og:description" content="${desc}"`)
            .replace(/name="description" content=".*?"/, `name="description" content="${desc}"`)
            .replace(/property="og:image" content=".*?"/, `property="og:image" content="${img}"`)
            .replace(/property="og:url" content=".*?"/, `property="og:url" content="${url}"`)
            .replace(/name="twitter:title" content=".*?"/, `name="twitter:title" content="${title}"`)
            .replace(/name="twitter:description" content=".*?"/, `name="twitter:description" content="${desc}"`)
            .replace(/name="twitter:image" content=".*?"/, `name="twitter:image" content="${img}"`);

        console.log('[SLUG-ROUTE] Sending HTML response');
        res.send(html);

    } catch (e) {
        console.error('[SLUG-ROUTE] ERROR:', e.message);
        console.error('[SLUG-ROUTE] STACK:', e.stack);
        res.status(500).sendFile(filePath);
    }
});

// Dynamic SEO for Article Detail
app.get('/article-detail.html', async (req, res) => {
    const filePath = path.join(__dirname, 'views', 'article-detail.html');
    const id = req.query.id;

    if (!id) {
        return res.sendFile(filePath);
    }

    try {
        const [rows] = await pool.query('SELECT title, excerpt, image_url, author_name FROM articles WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.sendFile(filePath);
        }

        const article = rows[0];
        let html = fs.readFileSync(filePath, 'utf8');

        // Replace Meta Tags
        const title = article.title + ' - AperionX';
        const desc = article.excerpt || article.title;
        const img = article.image_url ?
            (article.image_url.startsWith('http') ? article.image_url : `${req.protocol}://${req.get('host')}/${article.image_url.replace(/\\/g, '/')}`)
            : `${req.protocol}://${req.get('host')}/uploads/logo.png`;
        const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

        html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
            .replace(/property="og:title" content=".*?"/, `property="og:title" content="${title}"`)
            .replace(/property="og:description" content=".*?"/, `property="og:description" content="${desc}"`)
            .replace(/name="description" content=".*?"/, `name="description" content="${desc}"`)
            .replace(/property="og:image" content=".*?"/, `property="og:image" content="${img}"`)
            .replace(/property="og:url" content=".*?"/, `property="og:url" content="${url}"`)
            .replace(/name="twitter:title" content=".*?"/, `name="twitter:title" content="${title}"`)
            .replace(/name="twitter:description" content=".*?"/, `name="twitter:description" content="${desc}"`)
            .replace(/name="twitter:image" content=".*?"/, `name="twitter:image" content="${img}"`);

        res.send(html);

    } catch (e) {
        console.error('SEO Injection Error:', e);
        res.sendFile(filePath);
    }
});

// Serve Author Panel
app.get('/author', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'author.html'));
});

// Serve Editor Panel (DUPLICATE REMOVED - primary route at line ~2762)
// app.get('/editor', ...) -> already defined above serving editor_panel.html

// === LIKES & COMMENTS ===

// Likes
app.get('/api/articles/:id/like', authenticateToken, async (req, res) => {
    try {
        const articleId = req.params.id;
        const userId = req.user.id;
        const [likes] = await pool.query('SELECT COUNT(*) as count FROM likes WHERE article_id = ?', [articleId]);
        const [me] = await pool.query('SELECT * FROM likes WHERE article_id = ? AND user_id = ?', [articleId, userId]);
        res.json({ count: likes[0].count, liked: !!me.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/articles/:id/like', authenticateToken, async (req, res) => {
    try {
        const articleId = req.params.id;
        const userId = req.user.id;
        const [exists] = await pool.query('SELECT * FROM likes WHERE article_id = ? AND user_id = ?', [articleId, userId]);
        if (exists.length) {
            await pool.query('DELETE FROM likes WHERE article_id = ? AND user_id = ?', [articleId, userId]);
            res.json({ liked: false });
        } else {
            await pool.query('INSERT IGNORE INTO likes (article_id, user_id) VALUES (?, ?)', [articleId, userId]);
            res.json({ liked: true });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get Liked Articles (Profile)
app.get('/api/user/liked-articles', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.query(`
            SELECT a.*, l.created_at as liked_at 
            FROM articles a 
            JOIN likes l ON a.id = l.article_id 
            WHERE l.user_id = ? 
            ORDER BY l.created_at DESC`, [userId]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Comments - Public Get (Approved Only + My Pending)
app.get('/api/articles/:id/comments', async (req, res) => {
    try {
        const articleId = req.params.id;
        let userId = null;

        // Manual Auth Check
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gizli_anahtar');
                    userId = decoded.id;
                } catch (e) { }
            }
        }

        let query = `
            SELECT c.*, u.fullname 
            FROM comments c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.article_id = ? AND (c.is_approved = 1`;

        const params = [articleId];

        if (userId) {
            query += ` OR c.user_id = ?)`;
            params.push(userId);
        } else {
            query += `)`;
        }

        query += ` ORDER BY c.created_at DESC`;

        const [comments] = await pool.query(query, params);

        // Mark own comments for frontend
        const result = comments.map(c => ({
            ...c,
            is_mine: userId && c.user_id === userId
        }));

        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Post Comment (Auth Required)
app.post('/api/articles/:id/comments', authenticateToken, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'Yorum boş olamaz' });

        // Default is_approved = 1 (Auto-approve)
        const cleanContent = DOMPurify.sanitize(content);
        await pool.query('INSERT INTO comments (article_id, user_id, content, is_approved) VALUES (?, ?, ?, 1)', [req.params.id, req.user.id, cleanContent]);
        res.json({ message: 'Yorum gönderildi.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// === EXPERIMENT LIKES API ===
app.get('/api/experiments/:id/like', authenticateToken, async (req, res) => {
    try {
        const experimentId = req.params.id;
        const userId = req.user.id;
        const [likes] = await pool.query('SELECT COUNT(*) as count FROM likes WHERE experiment_id = ?', [experimentId]);
        const [me] = await pool.query('SELECT * FROM likes WHERE experiment_id = ? AND user_id = ?', [experimentId, userId]);
        res.json({ count: likes[0].count, liked: !!me.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/experiments/:id/like', authenticateToken, async (req, res) => {
    try {
        const experimentId = req.params.id;
        const userId = req.user.id;
        const [exists] = await pool.query('SELECT * FROM likes WHERE experiment_id = ? AND user_id = ?', [experimentId, userId]);
        if (exists.length) {
            await pool.query('DELETE FROM likes WHERE experiment_id = ? AND user_id = ?', [experimentId, userId]);
            res.json({ liked: false });
        } else {
            await pool.query('INSERT IGNORE INTO likes (experiment_id, user_id) VALUES (?, ?)', [experimentId, userId]);
            res.json({ liked: true });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// === EXPERIMENT COMMENTS API ===
app.get('/api/experiments/:id/comments', async (req, res) => {
    try {
        const experimentId = req.params.id;
        let userId = null;

        // Manual Auth Check
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gizli_anahtar');
                    userId = decoded.id;
                } catch (e) { }
            }
        }

        let query = `
            SELECT c.*, u.fullname 
            FROM comments c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.experiment_id = ? AND (c.is_approved = 1`;

        const params = [experimentId];

        if (userId) {
            query += ` OR c.user_id = ?)`;
            params.push(userId);
        } else {
            query += `)`;
        }

        query += ` ORDER BY c.created_at DESC`;

        const [comments] = await pool.query(query, params);

        const result = comments.map(c => ({
            ...c,
            is_mine: userId && c.user_id === userId
        }));

        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/experiments/:id/comments', authenticateToken, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'Yorum boş olamaz' });

        const cleanContent = DOMPurify.sanitize(content);
        await pool.query('INSERT INTO comments (experiment_id, user_id, content, is_approved) VALUES (?, ?, ?, 1)', [req.params.id, req.user.id, cleanContent]);
        res.json({ message: 'Yorum gönderildi.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// User Manage Own Comments (Edit/Delete)
app.put('/api/comments/:id', authenticateToken, async (req, res) => {
    try {
        const { content } = req.body;
        // Verify owner
        const [rows] = await pool.query('SELECT * FROM comments WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (!rows.length) return res.status(403).json({ error: 'Yetkisiz işlem' });

        const cleanContent = DOMPurify.sanitize(content);
        await pool.query('UPDATE comments SET content = ?, is_approved = 1 WHERE id = ?', [cleanContent, req.params.id]);
        res.json({ message: 'Yorum güncellendi.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/comments/:id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM comments WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (!rows.length) return res.status(403).json({ error: 'Yetkisiz işlem' });

        await pool.query('DELETE FROM comments WHERE id = ?', [req.params.id]);
        res.json({ message: 'Yorum silindi.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// === NOTIFICATIONS SYSTEM ===

// Helper: Create Notification
async function createNotification(userId, message, type = 'info') {
    try {
        await pool.query('INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)', [userId, message, type]);
    } catch (e) {
        console.error('Notification Error:', e);
    }
}

app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [req.user.id]);
        const [unread] = await pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0', [req.user.id]);
        res.json({ notifications: rows, unread: unread[0].count });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Marked read' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Admin Comment Moderation ---
app.get('/api/admin/comments', authenticateToken, async (req, res) => {
    // Basic role check
    if (req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);
    try {
        // Fetch pending comments mostly
        const [rows] = await pool.query(`
            SELECT c.*, u.fullname, a.title as article_title, e.title as experiment_title 
            FROM comments c 
            LEFT JOIN users u ON c.user_id = u.id 
            LEFT JOIN articles a ON c.article_id = a.id
            LEFT JOIN experiments e ON c.experiment_id = e.id
            ORDER BY c.created_at DESC`);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/comments/:id/approve', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);
    try {
        await pool.query('UPDATE comments SET is_approved = 1 WHERE id = ?', [req.params.id]);
        res.json({ message: 'Approved' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/comments/:id/reject', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);
    try {
        await pool.query('DELETE FROM comments WHERE id = ?', [req.params.id]);
        res.json({ message: 'Rejected/Deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SEO: Sitemap.xml ---
app.get('/sitemap.xml', async (req, res) => {
    try {
        // Fetch updated_at for accurate SEO "lastmod"
        const [articles] = await pool.query("SELECT id, slug, created_at, updated_at FROM articles WHERE status = 'published' ORDER BY created_at DESC");
        const [categories] = await pool.query("SELECT * FROM categories");
        const [experiments] = await pool.query("SELECT slug, created_at FROM experiments WHERE status = 'published' AND deleted_at IS NULL ORDER BY created_at DESC");

        // Use dynamic host but prefer https://www.aperionx.com if host header matches
        let baseUrl = `https://${req.get('host')}`;
        if (req.get('host').includes('aperionx.com')) {
            baseUrl = 'https://www.aperionx.com';
        }

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${baseUrl}/</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${baseUrl}/articles.html</loc>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>${baseUrl}/experiments.html</loc>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>${baseUrl}/about.html</loc>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>`;

        // Categories
        categories.forEach(cat => {
            xml += `
    <url>
        <loc>${baseUrl}/articles.html?category=${encodeURIComponent(cat.name)}</loc>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
        });

        // Articles (Using Slugs)
        articles.forEach(art => {
            // Prefer updated_at, fallback to created_at
            const dateStr = art.updated_at || art.created_at;
            const lastMod = new Date(dateStr).toISOString();
            xml += `
    <url>
        <loc>${baseUrl}/makale/${art.slug}</loc>
        <lastmod>${lastMod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
        });

        // Experiments (Using Slugs)
        experiments.forEach(exp => {
            const lastMod = new Date(exp.created_at).toISOString();
            xml += `
    <url>
        <loc>${baseUrl}/deney/${exp.slug}</loc>
        <lastmod>${lastMod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
        });

        xml += `
</urlset>`;

        res.header('Content-Type', 'application/xml');
        res.send(xml);

    } catch (e) {
        console.error('Sitemap Error:', e);
        res.status(500).end();
    }
});





// === TEAM MEMBERS API ===

// GET Team Members (Public)
app.get('/api/team', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM team_members ORDER BY order_index ASC, id ASC');
        res.json(rows);
    } catch (e) {
        console.error('Team Members Fetch Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ADD Team Member (Admin Only)
app.post('/api/admin/team', authenticateToken, upload.single('image'), optimizeImageMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const { fullname, role, email, linkedin_url, order_index } = req.body;
        const image_url = req.file ? 'uploads/' + req.file.filename : null;
        const [result] = await pool.query(
            'INSERT INTO team_members (fullname, role, image_url, email, linkedin_url, order_index) VALUES (?, ?, ?, ?, ?, ?)',
            [fullname, role, image_url, email || null, linkedin_url || null, parseInt(order_index) || 0]
        );
        clearCache('team_members');
        res.json({ message: 'Ekip üyesi eklendi', id: result.insertId });
    } catch (e) {
        console.error('Team Member Add Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// UPDATE Team Member (Admin Only)
app.put('/api/admin/team/:id', authenticateToken, upload.single('image'), optimizeImageMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const { fullname, role, email, linkedin_url, order_index } = req.body;
        const memberId = req.params.id;

        let image_url = req.body.existing_image || null;
        if (req.file) {
            image_url = 'uploads/' + req.file.filename;
            // Delete old image if exists
            if (req.body.existing_image) {
                const oldPath = path.join(__dirname, req.body.existing_image);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        }

        await pool.query(
            'UPDATE team_members SET fullname = ?, role = ?, image_url = ?, email = ?, linkedin_url = ?, order_index = ? WHERE id = ?',
            [fullname, role, image_url, email || null, linkedin_url || null, parseInt(order_index) || 0, memberId]
        );
        clearCache('team_members');
        res.json({ message: 'Ekip üyesi güncellendi' });
    } catch (e) {
        console.error('Team Member Update Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// DELETE Team Member (Admin Only)
app.delete('/api/admin/team/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [rows] = await pool.query('SELECT image_url FROM team_members WHERE id = ?', [req.params.id]);
        if (rows.length > 0 && rows[0].image_url) {
            const imgPath = path.join(__dirname, rows[0].image_url);
            if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        }
        await pool.query('DELETE FROM team_members WHERE id = ?', [req.params.id]);
        clearCache('team_members');
        res.json({ message: 'Ekip üyesi silindi' });
    } catch (e) {
        console.error('Team Member Delete Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// === SETTINGS API ===

// GET Settings
app.get('/api/settings', async (req, res) => {
    try {
        const cacheKey = 'settings';
        const cached = getCachedData(cacheKey);
        if (cached) return res.json(cached);

        const [rows] = await pool.query('SELECT * FROM settings');
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });

        // Add Google Client ID from environment
        settings.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

        setCachedData(cacheKey, settings);
        res.json(settings);
    } catch (e) {
        console.error('Settings Fetch Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// GET Email Logs (Admin Only)
app.get('/api/admin/email-logs', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [rows] = await pool.query(`
            SELECT el.*, a.title as article_title 
            FROM email_logs el 
            LEFT JOIN articles a ON el.article_id = a.id 
            ORDER BY el.sent_at DESC LIMIT 50
        `);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// SAVE Settings (Admin Only)
// SAVE Settings (Admin Only) - ROBUST VERSION
app.post('/api/settings', authenticateToken, upload.any(), async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);

    console.log('DEBUG: Settings POST started', { files: req.files ? req.files.length : 0 });

    try {
        const settings = req.body || {};

        // Handle Files from upload.any() (req.files is an array)
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                // Determine field name and map to settings
                // Example: file.fieldname = 'site_logo'
                settings[file.fieldname] = 'uploads/' + file.filename;
            });
        }

        // Save each setting
        for (const [key, value] of Object.entries(settings)) {
            // Upsert into settings (NOT site_settings)
            const [rows] = await pool.query('SELECT setting_key FROM settings WHERE setting_key = ?', [key]);
            if (rows.length > 0) {
                await pool.query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [value, key]);
            } else {
                await pool.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', [key, value]);
            }
        }

        clearCache('settings');
        res.json({ message: 'Ayarlar başarıyla kaydedildi' });

    } catch (e) {
        console.error('Settings Save Error (Detailed):', e);
        res.status(500).json({ error: 'Sunucu Hatası: ' + e.message, stack: e.stack });
    }
});


// Helper: Get Article Authors
async function getArticleAuthors(pool, articleId) {
    try {
        const [rows] = await pool.query(`
            SELECT u.id, u.fullname, u.username, u.avatar_url, u.bio, u.job_title
            FROM article_authors aa
            JOIN users u ON aa.user_id = u.id
            WHERE aa.article_id = ?
            ORDER BY aa.order_index ASC
        `, [articleId]);
        return rows;
    } catch (e) {
        console.error('getArticleAuthors Error:', e);
        return [];
    }
}

// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
    console.error('[GLOBAL ERROR HANDLER]', err);
    res.status(500).json({ error: 'Global Server Error', details: err.message });
});


// === EDITOR PANEL API ROUTES ===

// 1. Editor Stats
app.get('/api/editor/stats', authenticateToken, async (req, res) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [pending] = await pool.query("SELECT COUNT(*) as count FROM articles WHERE status = 'pending'");
        const [published] = await pool.query("SELECT COUNT(*) as count FROM articles WHERE status = 'published'");
        const [rejected] = await pool.query("SELECT COUNT(*) as count FROM articles WHERE status = 'rejected'");

        // Engagement Stats
        const [views] = await pool.query("SELECT SUM(views) as total FROM articles WHERE status = 'published'");
        const [likes] = await pool.query("SELECT COUNT(*) as total FROM likes");
        const [comments] = await pool.query("SELECT COUNT(*) as total FROM comments");

        res.json({
            pending: pending[0].count,
            published: published[0].count,
            rejected: rejected[0].count,
            total_views: views[0].total || 0,
            total_likes: likes[0].total || 0,
            total_comments: comments[0].total || 0
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Pending Articles
app.get('/api/editor/pending-articles', authenticateToken, async (req, res) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [rows] = await pool.query("SELECT * FROM articles WHERE status = 'pending' ORDER BY created_at ASC");
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. History (Published/Rejected)
app.get('/api/editor/history', authenticateToken, async (req, res) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [rows] = await pool.query("SELECT * FROM articles WHERE status IN ('published', 'rejected') ORDER BY updated_at DESC LIMIT 50");
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. Trash
app.get('/api/editor/trash', authenticateToken, async (req, res) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
    try {
        // Assuming 'trash' status exists or logical delete logic. 
        // If not using 'trash' status, we can return empty or implement a status.
        // Schema check: status ENUM('published', 'draft', 'pending', 'rejected') - 'trash' might fail?
        // Let's check ENUM. If needed, we alter table. 
        // For now, let's assume 'rejected' acts as trash or return empty if not implemented.
        // The user hasn't explicitly asked for trash logic, just that panel works.
        const [rows] = await pool.query("SELECT * FROM articles WHERE status = 'trash' ORDER BY updated_at DESC");
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. Authors List
app.get('/api/editor/authors', authenticateToken, async (req, res) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [rows] = await pool.query("SELECT id, fullname, email FROM users WHERE role = 'author'");
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. Decide (Approve/Reject)
app.put('/api/editor/decide/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
    const { decision, rejection_reason } = req.body; // decision: 'approve' or 'reject'

    try {
        if (decision === 'approve') {
            await pool.query("UPDATE articles SET status = 'published', approved_by = ?, rejection_reason = NULL, updated_at = NOW() WHERE id = ?", [req.user.id, req.params.id]);

            // Trigger Email Notification (Background)
            // AUTO-SEND DISABLED: Manual control enabled via Admin Panel
            // sendNewArticleNotification(req.params.id).catch(err => console.error('Notification Error:', err));

        } else if (decision === 'reject') {
            await pool.query("UPDATE articles SET status = 'rejected', approved_by = ?, rejection_reason = ?, updated_at = NOW() WHERE id = ?", [req.user.id, rejection_reason, req.params.id]);
        } else {
            return res.status(400).json({ error: 'Invalid decision' });
        }
        res.json({ message: 'Success' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 7. Restore
app.put('/api/articles/restore/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
    try {
        await pool.query("UPDATE articles SET status = 'draft' WHERE id = ?", [req.params.id]);
        res.json({ message: 'Restored to draft' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// === SEO PING SYSTEM ===
async function pingSearchEngines(articleSlug) {
    const https = require('https');
    const sitemapUrl = encodeURIComponent('https://aperionx.com/sitemap.xml');
    const articleUrl = encodeURIComponent(`https://aperionx.com/makale/${articleSlug}`);

    const targets = [
        `https://www.google.com/ping?sitemap=${sitemapUrl}`,
        `https://www.bing.com/ping?sitemap=${sitemapUrl}`,
    ];

    for (const url of targets) {
        try {
            await new Promise((resolve, reject) => {
                https.get(url, (resp) => {
                    console.log(`[SEO-PING] ✅ Pinged: ${url.split('?')[0]} -> Status: ${resp.statusCode}`);
                    resp.resume();
                    resolve();
                }).on('error', (err) => {
                    console.error(`[SEO-PING] ❌ Failed: ${url.split('?')[0]} -> ${err.message}`);
                    resolve(); // Don't block on ping failure
                });
            });
        } catch (e) {
            console.error(`[SEO-PING] Error pinging ${url}:`, e.message);
        }
    }

    console.log(`[SEO-PING] Ping cycle completed for article: ${articleSlug}`);
}

// === AUTO NEWSLETTER ON APPROVE ===
async function autoSendNewsletter(articleId) {
    try {
        console.log(`[AUTO-NEWSLETTER] Starting auto-send for Article ID: ${articleId}`);

        // Get all subscribed users
        const [users] = await pool.query("SELECT email FROM users WHERE email IS NOT NULL AND is_subscribed = 1");
        if (users.length === 0) {
            console.log('[AUTO-NEWSLETTER] No subscribed users found.');
            return;
        }

        const recipients = users.map(u => u.email);
        console.log(`[AUTO-NEWSLETTER] Sending to ${recipients.length} subscribers...`);

        await sendNewsletterToRecipients(articleId, recipients);
        console.log(`[AUTO-NEWSLETTER] ✅ Completed for Article ID: ${articleId}`);
    } catch (e) {
        console.error('[AUTO-NEWSLETTER] ❌ Error:', e.message);
    }
}

// Helper: Send New Article Notification to All Users
// === MANUAL NEWSLETTER SYSTEM ===

// 1. Preview Newsletter
app.get('/api/admin/newsletter/preview/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);
    try {
        const html = await generateNewsletterHTML(req.params.id);
        if (!html) return res.status(404).send('Makale bulunamadı');
        res.send(html);
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

// 2. Send Newsletter
app.post('/api/admin/newsletter/send', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);
    const { articleId, target, customEmails } = req.body; // target: 'all', 'test', 'custom'

    try {
        let recipients = [];

        if (target === 'test') {
            recipients = [req.user.email];
        } else if (target === 'custom') {
            if (!Array.isArray(customEmails) || customEmails.length === 0) return res.status(400).json({ error: 'Alıcı listesi boş.' });
            recipients = customEmails;
        } else {
            // All Subscribers - Fix: Remove role restriction to include everyone subscribed
            const [users] = await pool.query("SELECT email FROM users WHERE email IS NOT NULL AND is_subscribed = 1");
            recipients = users.map(u => u.email);
        }

        if (recipients.length === 0) return res.status(400).json({ error: 'Gönderilecek alıcı bulunamadı.' });

        // Send logic
        await sendNewsletterToRecipients(articleId, recipients);
        res.json({ message: `${recipients.length} kişiye gönderim başlatıldı.` });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Helper: Generate HTML
async function generateNewsletterHTML(articleId) {
    const [rows] = await pool.query(`
        SELECT a.*, u.fullname as author_name
        FROM articles a
        LEFT JOIN users u ON a.author_id = u.id
        WHERE a.id = ?
    `, [articleId]);

    if (rows.length === 0) return null;
    const article = rows[0];

    const siteUrl = 'https://aperionx.com';
    const articleLink = `${siteUrl}/makale/${article.slug}`;
    const unsubscribeLink = `${siteUrl}/unsubscribe.html`;
    const heroImage = article.image_url ?
        (article.image_url.startsWith('http') ? article.image_url : `${siteUrl}/${article.image_url}`) :
        `${siteUrl}/uploads/default-hero.jpg`;

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; }
                .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background-color: #0f172a; padding: 25px; text-align: center; }
                .logo { max-width: 180px; height: auto; display: block; margin: 0 auto; }
                .hero-image { width: 100%; height: 250px; object-fit: cover; }
                .content { padding: 30px; color: #334155; }
                .tag { display: inline-block; background-color: #e0e7ff; color: #4f46e5; padding: 4px 12px; border-radius: 50px; font-size: 12px; font-weight: bold; margin-bottom: 15px; }
                .title { font-size: 26px; font-weight: 800; color: #0f172a; margin: 10px 0 15px 0; line-height: 1.3; }
                .author { font-size: 14px; color: #64748b; margin-bottom: 20px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
                .excerpt { font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 30px; }
                .button-container { text-align: center; margin: 30px 0; }
                .read-btn { background-color: #4f46e5; color: #ffffff !important; padding: 16px 36px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4); }
                .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                   <a href="${siteUrl}" style="text-decoration:none;">
                        <img src="cid:unique-logo-id" alt="AperionX" class="logo" style="color: white; font-size: 24px; font-weight: bold;">
                   </a>
                </div>
                <a href="${articleLink}" style="text-decoration:none; display:block;">
                    <img src="${heroImage}" alt="${article.title}" class="hero-image">
                </a>
                <div class="content">
                    <span class="tag">YENİ MAKALE</span>
                    <h1 class="title">${article.title}</h1>

                    <div class="author">
                        <span>🖊️ Yazar: <span style="color: #0f172a;">${article.author_name || 'AperionX Yazarı'}</span></span>
                    </div>

                    <p class="excerpt">${article.excerpt || 'Bilim ve teknolojinin derinliklerine yolculuk...'}</p>

                    <div class="button-container">
                        <a href="${articleLink}" class="read-btn">Makaleyi Oku</a>
                    </div>
                </div>
                <div class="footer">
                    <p>&copy; 2025 AperionX. Bilimin Sınırlarında.</p>
                    <p>Bu bülten üyelerimize özel otomatik olarak gönderilmiştir. Almak istemiyorsanız <a href="${unsubscribeLink}">buradan ayrılabilirsiniz</a>.</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

// Helper: Send to Recipients (Individual Loop with Rate-Limiting & Backoff)
async function sendNewsletterToRecipients(articleId, recipientEmails) {
    if (recipientEmails.length === 0) return;

    const htmlContent = await generateNewsletterHTML(articleId);
    if (!htmlContent) return;

    const logoPath = path.join(__dirname, 'uploads', 'logo.png');

    // Fetch Article Title for Subject
    const [rows] = await pool.query('SELECT title FROM articles WHERE id = ?', [articleId]);
    if (rows.length === 0) return;
    const articleTitle = rows[0].title;

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        tls: { rejectUnauthorized: false },
        pool: true,           // Use connection pooling
        maxConnections: 1,    // Only 1 connection at a time
        maxMessages: 10,      // Max 10 messages per connection
        rateDelta: 2000,      // Min 2 seconds between messages
        rateLimit: 1           // Max 1 message per rateDelta
    });

    console.log(`[NEWSLETTER] Starting batch send to ${recipientEmails.length} recipients...`);

    let successCount = 0;
    let failCount = 0;
    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 5; // Circuit breaker: stop after 5 failures in a row

    // Send individually with rate limiting
    for (const recipient of recipientEmails) {
        // Circuit breaker: if too many consecutive failures, abort
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            console.error(`[NEWSLETTER] ⛔ Circuit breaker triggered after ${MAX_CONSECUTIVE_FAILURES} consecutive failures. Aborting batch.`);
            break;
        }

        try {
            await transporter.sendMail({
                from: '"AperionX Bülten" <' + process.env.SMTP_USER + '>',
                to: recipient,
                subject: `✨ Yeni Makale: ${articleTitle}`,
                html: htmlContent,
                attachments: [{ filename: 'logo.png', path: logoPath, cid: 'unique-logo-id' }]
            });
            successCount++;
            consecutiveFailures = 0; // Reset on success
            // Polite delay between sends (1.5 seconds)
            await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (e) {
            console.error(`[NEWSLETTER] Failed to send to ${recipient}: ${e.message}`);
            failCount++;
            consecutiveFailures++;

            // Exponential backoff on failure (wait longer after each consecutive failure)
            const backoffMs = Math.min(consecutiveFailures * 3000, 30000); // 3s, 6s, 9s... max 30s
            console.log(`[NEWSLETTER] Backing off for ${backoffMs / 1000}s after failure...`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
    }

    console.log(`[NEWSLETTER] Batch finished. Success: ${successCount}, Fail: ${failCount}`);

    // Close the transporter pool
    transporter.close();

    // Log to DB - use VARCHAR-safe status values
    const status = failCount === 0 ? 'sent' : (successCount > 0 ? 'partial' : 'failed');

    try {
        await pool.query('INSERT INTO email_logs (article_id, subject, recipient_count, status) VALUES (?, ?, ?, ?)',
            [articleId, `✨ Yeni Makale: ${articleTitle}`, successCount, status]);
    } catch (e) {
        console.error('[NEWSLETTER] Error logging to DB:', e);
    }
}

// Unsubscribe Endpoint
app.post('/api/public/unsubscribe', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'E-posta gerekli.' });

    try {
        const [result] = await pool.query("UPDATE users SET is_subscribed = 0 WHERE email = ?", [email]);
        if (result.affectedRows > 0) {
            res.json({ message: 'Başarıyla ayrıldınız.' });
        } else {
            res.status(404).json({ message: 'E-posta bulunamadı veya zaten kayıtlı değil.' });
        }
    } catch (e) {
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
});


// GLOBAL 404 HANDLER (MUST BE LAST)
// BUT FIRST: SEO Injection for Articles
app.get('/makale/:slug', async (req, res) => {
    const slug = req.params.slug;
    const filePath = path.join(__dirname, 'views', 'index.html');

    // 1. Read index.html
    fs.readFile(filePath, 'utf8', async (err, htmlData) => {
        if (err) {
            console.error('Error reading index.html', err);
            return res.status(500).send('Server Error');
        }

        try {
            // 2. Fetch Article Data
            const [rows] = await pool.query('SELECT title, excerpt, image_url FROM articles WHERE slug = ?', [slug]);

            if (rows.length > 0) {
                const article = rows[0];
                const siteUrl = 'https://aperionx.com';
                const imageUrl = article.image_url ?
                    (article.image_url.startsWith('http') ? article.image_url : `${siteUrl}/${article.image_url}`) :
                    `${siteUrl}/uploads/logo.png`;

                // 3. Inject SEO Tags
                // Replace Title
                htmlData = htmlData.replace(
                    /<title>.*?<\/title>/,
                    `<title>${article.title} - AperionX</title>`
                );

                // Replace Description (Meta & OG & Twitter)
                const description = article.excerpt || 'AperionX ile Bilimin Sınırlarını Keşfedin.';
                // Escape quotes to prevent breaking HTML
                const safeDesc = description.replace(/"/g, '&quot;');

                // Meta Description
                htmlData = htmlData.replace(
                    /<meta name="description" content=".*?">/,
                    `<meta name="description" content="${safeDesc}">`
                );

                // OG Tags
                htmlData = htmlData.replace(
                    /<meta property="og:title" content=".*?">/,
                    `<meta property="og:title" content="${article.title} - AperionX">`
                );
                htmlData = htmlData.replace(
                    /<meta property="og:description" content=".*?">/,
                    `<meta property="og:description" content="${safeDesc}">`
                );
                htmlData = htmlData.replace(
                    /<meta property="og:image" content=".*?">/,
                    `<meta property="og:image" content="${imageUrl}">`
                );
                htmlData = htmlData.replace(
                    /<meta property="og:url" content=".*?">/,
                    `<meta property="og:url" content="${siteUrl}/makale/${slug}">`
                );

                // FIXED: Canonical Tag
                htmlData = htmlData.replace(
                    /<link rel="canonical" href=".*?">/,
                    `<link rel="canonical" href="${siteUrl}/makale/${slug}" />\n    <link rel="alternate" hreflang="tr" href="${siteUrl}/makale/${slug}">\n    <link rel="alternate" hreflang="en" href="${siteUrl}/en/makale/${slug}">\n    <link rel="alternate" hreflang="x-default" href="${siteUrl}/makale/${slug}">`
                );

                // Twitter Tags
                htmlData = htmlData.replace(
                    /<meta property="twitter:title" content=".*?">/,
                    `<meta property="twitter:title" content="${article.title} - AperionX">`
                );
                htmlData = htmlData.replace(
                    /<meta property="twitter:description" content=".*?">/,
                    `<meta property="twitter:description" content="${safeDesc}">`
                );
                htmlData = htmlData.replace(
                    /<meta property="twitter:image" content=".*?">/,
                    `<meta property="twitter:image" content="${article.image_url}">`
                );
                
                // Add more replacements if needed...
            }
            res.send(htmlData);
        } catch (dbErr) {
            console.error('Database error in /makale/:slug', dbErr);
            res.send(htmlData); // Fallback to unmodified HTML
        }
    });
});

app.use((req, res) => {
    // Check if it looks like an API call first
    if (req.originalUrl.startsWith('/api')) {
        console.warn(`[404] Route not found: ${req.method} ${req.originalUrl}`);
        return res.status(404).json({ message: `AperionX Process - Endpoint bulunamadı: ${req.method} ${req.originalUrl}` });
    }

    // Serve HTML 404 page for front-end routes and unknown paths
    res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

// Start Server
// Start Server
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('SERVER RESTARTING WITH LATEST CODE...');
    console.log(`Server running on http://localhost:${PORT}`);

    // Check and Send Latest Article Notification if missed
    // await checkAndSendLatestNotification(); // DISABLED FOR MANUAL CHECK
});

async function checkAndSendLatestNotification() {
    try {
        // 1. Get Latest Published Article
        const [rows] = await pool.query("SELECT id, title FROM articles WHERE status = 'published' ORDER BY created_at DESC LIMIT 1");
        if (rows.length === 0) return;

        const article = rows[0];

        // 2. Check if already sent
        const [logs] = await pool.query("SELECT id FROM email_logs WHERE article_id = ? AND status = 'sent'", [article.id]);

        if (logs.length === 0) {
            console.log(`[STARTUP] Latest article "${article.title}" (ID: ${article.id}) notification not sent yet. Sending now...`);
            await sendNewArticleNotification(article.id);
        } else {
            console.log(`[STARTUP] Notification for latest article "${article.title}" already sent.`);
        }
    } catch (e) {
        console.error('[STARTUP] Failed to check for latest notifications:', e);
    }
}

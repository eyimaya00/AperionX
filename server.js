const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const DOMPurify = require('isomorphic-dompurify');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'gizli_anahtar';

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '100mb' }));

// === DYNAMIC SEO: Article Detail ===
// Intercept /article-detail.html to inject meta tags
app.get('/article-detail.html', async (req, res, next) => {
    const articleId = req.query.id;
    if (!articleId) return next();

    try {
        const [rows] = await pool.query('SELECT title, summary, image_url, created_at FROM articles WHERE id = ?', [articleId]);
        if (rows.length === 0) return next();

        const article = rows[0];
        const filePath = path.join(__dirname, 'article-detail.html');

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) return next();

            const title = article.title.replace(/"/g, '&quot;');
            const summary = article.summary ? article.summary.replace(/"/g, '&quot;') : 'AperionX Makalesi';
            const image = article.image_url ? `${req.protocol}://${req.get('host')}/${article.image_url.replace(/\\/g, '/')}` : '';
            const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

            // Format Date for SEO
            const date = new Date(article.created_at).toISOString();

            let html = data
                // Basic
                .replace('<title>Makale Yükleniyor... - AperionX</title>', `<title>${title} - AperionX</title>`)
                .replace('<meta name="description" content="AperionX bilim ve teknoloji makaleleri">', `<meta name="description" content="${summary}">`)
                // Open Graph
                .replace('<meta property="og:title" content="AperionX">', `<meta property="og:title" content="${title}">`)
                .replace('<meta property="og:description" content="Bilim ve teknolojinin sınırlarını zorlayın.">', `<meta property="og:description" content="${summary}">`)
                .replace('<meta property="og:image" content="">', `<meta property="og:image" content="${image}">`)
                .replace('<meta property="og:url" content="">', `<meta property="og:url" content="${url}">`)
                // Twitter
                .replace('<meta name="twitter:card" content="summary_large_image">',
                    `<meta name="twitter:card" content="summary_large_image">
                     <meta name="twitter:title" content="${title}">
                     <meta name="twitter:description" content="${summary}">
                     <meta name="twitter:image" content="${image}">`);

            res.send(html);
        });
    } catch (e) {
        console.error('SEO Injection Error:', e);
        next();
    }
});
app.use(express.static(__dirname)); // Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Explicitly serve uploads


// Database Connection
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

const pool = mysql.createPool(dbConfig);



// DB Config

// File Upload Configuration
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

// Article Image Storage
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

// Upload Endpoint
app.post('/api/upload', authenticateToken, uploadArticleImage.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    // Return relative path
    res.json({ url: `uploads/article_images/${req.file.filename}` });
});

// === HELPER === 
// Check Auth Middleware
// Check Auth Middleware
// Check Auth Middleware
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
        next();
    });
}

// === ROUTES ===

// 1. Site Settings (Generic)
app.get('/api/settings', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM site_settings');
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        res.json(settings);
    } catch (e) {
        res.status(500).send(e.toString());
    }
});



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
        const [rows] = await pool.query('SELECT * FROM menu_items ORDER BY order_index ASC');
        res.json(rows);
    } catch (e) { res.status(500).send(e.toString()); }
});

app.post('/api/menu', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { label, url } = req.body;
    try {
        const [max] = await pool.query('SELECT MAX(order_index) as maxOrder FROM menu_items');
        const nextOrder = (max[0].maxOrder || 0) + 1;
        await pool.query('INSERT INTO menu_items (label, url, order_index) VALUES (?, ?, ?)', [label, url, nextOrder]);
        res.status(201).json({ message: 'Menu item added' });
    } catch (e) { res.status(500).send(e.toString()); }
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
            await pool.query('UPDATE menu_items SET order_index = ? WHERE id = ?', [item.order_index, item.id]);
        }
        res.json({ message: 'Reordered' });
    } catch (e) { res.status(500).send(e.toString()); }
});

app.get('/api/hero-slides', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM hero_slides ORDER BY order_index ASC');
        res.json(rows);
    } catch (e) { res.status(500).send(e); }
});

app.post('/api/hero-slides', authenticateToken, upload.single('image'), async (req, res) => {
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
    const { fullname, email, password, role } = req.body;
    if (!fullname || !email || !password || !role) return res.status(400).json({ error: 'Tüm alanlar gerekli.' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, ?)', [fullname, email, hashedPassword, role]);
        res.status(201).json({ message: 'User created' });
    } catch (e) { res.status(500).json({ error: 'E-posta kullanılıyor olabilir.' }); }
});

app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
});

app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [u] = await pool.query('SELECT COUNT(*) as count FROM users');
        const [a] = await pool.query("SELECT COUNT(*) as count FROM articles WHERE status = 'published'");
        const [v] = await pool.query("SELECT SUM(views) as count FROM articles");
        const [l] = await pool.query("SELECT COUNT(*) as count FROM likes");
        const [c] = await pool.query("SELECT COUNT(*) as count FROM comments");

        res.json({
            users: u[0].count,
            articles: a[0].count,
            views: v[0].count || 0,
            likes: l[0].count,
            comments: c[0].count
        });
    } catch (e) { res.status(500).send(e.toString()); }
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
            SELECT a.*, u.fullname as author_name 
            FROM articles a 
            LEFT JOIN users u ON a.author_id = u.id 
            ORDER BY a.created_at DESC
        `);
        res.json(rows);
    } catch (e) { res.status(500).send(e.toString()); }
});


// 3. Articles (GET Public, POST Author)
// Duplicate route removed


app.get('/api/articles/my-articles', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT a.*, 
            (SELECT COUNT(*) FROM likes WHERE article_id = a.id) as like_count,
            (SELECT COUNT(*) FROM comments WHERE article_id = a.id) as comment_count
            FROM articles a 
            WHERE author_id = ? 
            ORDER BY created_at DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (e) { res.status(500).send(e.toString()); }
});

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
    const { title, category, content, excerpt, status, tags, references_list } = body;
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

        await pool.query(
            'INSERT INTO articles (title, category, content, image_url, author_id, excerpt, status, tags, references_list, pdf_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [title, category, cleanContent, image_url, req.user.id, excerpt, finalStatus, tags, references_list, pdf_url]
        );
        console.log('Route: Article inserted successfully');
        res.status(201).json({ message: 'Article created', status: finalStatus });
    } catch (e) {
        console.error('Route: DB Error:', e);
        res.status(500).send(e.toString());
    }
});

// Upload Image Endpoint for Editor
app.post('/api/upload-image', authenticateToken, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    res.json({ url: 'uploads/' + req.file.filename });
});

app.put('/api/articles/:id', authenticateToken, upload.fields([{ name: 'image' }, { name: 'pdf' }]), async (req, res) => {
    const articleId = req.params.id;
    // Verify ownership
    const [check] = await pool.query('SELECT author_id FROM articles WHERE id = ?', [articleId]);
    if (check.length === 0) return res.status(404).json({ message: 'Not found' });
    if (check[0].author_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);

    const { title, category, content, excerpt, status, tags, references_list } = req.body;

    // Determine status update logic
    // If editing a 'published' article, does it go back to pending? 
    // Usually yes for major edits, but let's keep it simple: 
    // If Author sets 'published' -> 'pending'.
    let finalStatus = status;
    if (status === 'published' && req.user.role === 'author') {
        finalStatus = 'pending';
    }

    let updates = [];
    let params = [];

    if (title) { updates.push('title = ?'); params.push(title); }
    if (category) { updates.push('category = ?'); params.push(category); }
    if (content) {
        updates.push('content = ?');
        params.push(DOMPurify.sanitize(content));
    }
    if (excerpt) { updates.push('excerpt = ?'); params.push(excerpt); }
    if (finalStatus) { updates.push('status = ?'); params.push(finalStatus); }
    if (tags) { updates.push('tags = ?'); params.push(tags); }
    if (references_list) { updates.push('references_list = ?'); params.push(references_list); }

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

// Soft Delete
app.delete('/api/articles/:id', authenticateToken, async (req, res) => {
    // Owner or Admin
    const [check] = await pool.query('SELECT author_id FROM articles WHERE id = ?', [req.params.id]);
    if (check.length === 0) return res.status(404).json({ message: 'Not found' });
    if (check[0].author_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);

    await pool.query("UPDATE articles SET status = 'trash' WHERE id = ?", [req.params.id]);
    res.json({ message: 'Moved to trash' });
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

        res.json({
            published: published[0].count,
            pending: pending[0].count,
            views: views[0].count || 0,
            likes: likes[0].count || 0,
            comments: comments[0].count || 0
        });
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

app.get('/api/author/analytics', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all articles with their view counts, like counts AND COMMENT counts
        const [articles] = await pool.query(`
            SELECT 
                a.id, 
                a.title, 
                a.created_at, 
                a.views, 
                (SELECT COUNT(*) FROM likes WHERE article_id = a.id) as likes,
                (SELECT COUNT(*) FROM comments WHERE article_id = a.id) as comments
            FROM articles a
            WHERE a.author_id = ? AND a.status = 'published'
            ORDER BY a.created_at DESC
        `, [userId]);

        // Calculate totals
        let totalViews = 0;
        let totalLikes = 0;
        let totalComments = 0;

        articles.forEach(art => {
            totalViews += art.views;
            totalLikes += art.likes;
            totalComments += art.comments;
        });

        res.json({
            totalViews,
            totalLikes,
            totalComments,
            articles
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

    try {
        await pool.query('UPDATE articles SET status = ?, rejection_reason = ? WHERE id = ?', [status, reasonValue, req.params.id]);
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



// 2. Hero Slides
app.get('/api/hero-slides', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM hero_slides ORDER BY id DESC');
        res.json(rows);
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

app.post('/api/hero-slides', authenticateToken, upload.single('image'), async (req, res) => {
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

        // SMTP Transporter Setup
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const resetLink = `http://localhost:3000/index.html?token=${token}`;

        const mailOptions = {
            from: `"AperionX Destek" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Şifre Sıfırlama İsteği - AperionX',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h2 style="color: #6366f1; text-align: center;">Şifre Sıfırlama</h2>
                        <p>Merhaba,</p>
                        <p>AperionX hesabınız için şifre sıfırlama talebinde bulundunuz. Aşağıdaki butona tıklayarak yeni şifrenizi belirleyebilirsiniz:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Şifreni Sıfırla</a>
                        </div>
                        <p style="font-size: 12px; color: #888;">Bu işlemi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
                        <p style="font-size: 12px; color: #888; text-align: center; margin-top: 20px;">&copy; 2025 AperionX</p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        console.log(`[DEV] Password Reset Link (Backup Log) for ${email}: ${resetLink}`);

        res.json({ message: 'Sıfırlama bağlantısı e-posta adresinize gönderildi.' });

    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ message: 'E-posta gönderilirken bir hata oluştu. Lütfen sunucu ayarlarını kontrol edin.' });
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
// User Auth Routes
app.post('/api/register', async (req, res) => {
    const { fullname, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Default role is 'reader'
        await pool.query('INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, ?)', [fullname, email, hashedPassword, 'reader']);
        res.status(201).json({ message: 'User registered' });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) return res.status(400).json({ message: 'User not found' });

        const user = rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ message: 'Invalid password' });

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);

        // Return explicit redirect URLs based on role
        let redirectUrl = 'index.html'; // Default for reader
        if (user.role === 'admin') redirectUrl = 'admin'; // served by endpoint
        else if (user.role === 'author') redirectUrl = 'author';
        else if (user.role === 'editor') redirectUrl = 'editor';
        else if (user.role === 'reader') redirectUrl = 'index.html'; // Explicitly reader

        res.json({
            token,
            user: {
                id: user.id,
                fullname: user.fullname,
                email: user.email,
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

// Public: Get all published articles with filters
app.get('/api/articles', async (req, res) => {
    try {
        const { category, search, page = 1, limit = 9 } = req.query;
        // Truncate excerpt to avoid huge packet sizes if it contains full content
        let query = `
            SELECT a.id, a.title, a.category, u.fullname as author_name, a.image_url, a.created_at, a.views, LEFT(a.excerpt, 300) as excerpt 
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
        const articleId = req.params.id;
        // Verify it is published!
        const [rows] = await pool.query(
            `SELECT a.*, u.fullname as author_name 
             FROM articles a 
             LEFT JOIN users u ON a.author_id = u.id 
             WHERE a.id = ? AND a.status = 'published'`,
            [articleId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Makale bulunamadı veya yayında değil.' });
        }

        // Secure View Counting
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Check if this IP viewed this article in last 1 hour
        const [viewCheck] = await pool.query(
            `SELECT id FROM article_views 
             WHERE article_id = ? AND ip_address = ? AND viewed_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
            [articleId, ip]
        );

        if (viewCheck.length === 0) {
            // New view
            await pool.query('INSERT INTO article_views (article_id, ip_address) VALUES (?, ?)', [articleId, ip]);
            await pool.query('UPDATE articles SET views = views + 1 WHERE id = ?', [articleId]);
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Clean URLs
app.get('/admin', (req, res) => {
    res.sendFile('admin.html', { root: __dirname });
});

app.get('/author', (req, res) => {
    res.sendFile('author.html', { root: __dirname });
});

app.get('/editor', (req, res) => {
    console.log('Serving editor_panel.html');
    res.set('Cache-Control', 'no-store');
    res.sendFile('editor_panel.html', { root: __dirname });
});

// === CATEGORIES MANAGEMENT ===
app.get('/api/categories', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
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
app.put('/api/profile', authenticateToken, upload.single('avatar'), async (req, res) => {
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
app.get('/api/admin/all-articles', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const [rows] = await pool.query(`
            SELECT a.id, a.title, a.status, a.created_at, u.fullname as author_name 
            FROM articles a
            LEFT JOIN users u ON a.author_id = u.id
            ORDER BY a.created_at DESC
        `);
        res.json(rows);
    } catch (e) {
        res.status(500).send(e.toString());
    }
});

// Admin: Get Chart Data
app.get('/api/admin/chart-data', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        // 1. Daily Views (Last 7 Days)
        // Note: Using article_views table which tracks unique views by IP/Hour
        const [viewsRows] = await pool.query(`
            SELECT DATE(viewed_at) as date, COUNT(*) as count 
            FROM article_views 
            WHERE viewed_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) 
            GROUP BY DATE(viewed_at) 
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

        // 3. Monthly Calculated Stats (Last 30 Days)
        const [mViews] = await pool.query('SELECT COUNT(*) as count FROM article_views WHERE viewed_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)');
        const [mLikes] = await pool.query('SELECT COUNT(*) as count FROM likes WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)');
        const [mComments] = await pool.query('SELECT COUNT(*) as count FROM comments WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)');
        const [mUsers] = await pool.query('SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)');
        const [mArticles] = await pool.query("SELECT COUNT(*) as count FROM articles WHERE status='published' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)");

        // 4. Historical Data (Monthly) - Fetch last 12 months
        // Helper to format Date to YYYY-MM
        const getMonthGroups = async (table, dateCol) => {
            const [rows] = await pool.query(`SELECT DATE_FORMAT(${dateCol}, '%Y-%m') as month, COUNT(*) as count FROM ${table} GROUP BY month ORDER BY month DESC LIMIT 12`);
            return rows;
        };
        // Articles extra condition
        const getArticleMonthGroups = async () => {
            const [rows] = await pool.query(`SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count FROM articles WHERE status='published' GROUP BY month ORDER BY month DESC LIMIT 12`);
            return rows;
        };

        const hViews = await getMonthGroups('article_views', 'viewed_at');
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



// Serve Admin Panel
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve Author Panel
app.get('/author', (req, res) => {
    res.sendFile(path.join(__dirname, 'author.html'));
});

// Serve Editor Panel
app.get('/editor', (req, res) => {
    res.sendFile(path.join(__dirname, 'editor.html'));
});

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
            await pool.query('INSERT INTO likes (article_id, user_id) VALUES (?, ?)', [articleId, userId]);
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

// User Manage Own Comments (Edit/Delete)
app.put('/api/comments/:id', authenticateToken, async (req, res) => {
    try {
        const { content } = req.body;
        // Verify owner
        const [rows] = await pool.query('SELECT * FROM comments WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (!rows.length) return res.status(403).json({ error: 'Yetkisiz işlem' });

        await pool.query('UPDATE comments SET content = ?, is_approved = 1 WHERE id = ?', [DOMPurify.sanitize(content), req.params.id]);
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

// Get My Comments (Profile)
app.get('/api/user/comments', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT c.*, a.title as article_title, a.id as article_id 
            FROM comments c 
            LEFT JOIN articles a ON c.article_id = a.id 
            WHERE c.user_id = ? 
            ORDER BY c.created_at DESC`, [req.user.id]);
        res.json(rows);
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
            SELECT c.*, u.fullname, a.title as article_title 
            FROM comments c 
            LEFT JOIN users u ON c.user_id = u.id 
            LEFT JOIN articles a ON c.article_id = a.id
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
        const [articles] = await pool.query("SELECT id, title, created_at FROM articles WHERE status = 'published' ORDER BY created_at DESC");
        const [categories] = await pool.query("SELECT * FROM categories");

        const baseUrl = 'http://localhost:3000'; // Or your production URL

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

        // Articles
        articles.forEach(art => {
            xml += `
    <url>
        <loc>${baseUrl}/article-detail.html?id=${art.id}</loc>
        <lastmod>${new Date(art.created_at).toISOString()}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>`;
        });

        xml += `
</urlset>`;

        res.header('Content-Type', 'application/xml');
        res.send(xml);

    } catch (e) {
        console.error(e);
        res.status(500).end();
    }
});


// === SITE SETTINGS ===
app.get('/api/settings', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT setting_key, setting_value FROM site_settings');
        const settings = {};
        rows.forEach(row => {
            if (row.setting_key) {
                settings[row.setting_key] = row.setting_value;
            }
        });
        res.json(settings);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/settings', authenticateToken, upload.any(), async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const updates = req.body;

        // Merge file uploads into updates
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                // Determine the key from fieldname
                // Multer saves with unique filename, we want to store the path "uploads/filename"
                updates[file.fieldname] = file.path.replace(/\\/g, '/');
            });
        }

        const keys = Object.keys(updates);

        if (keys.length === 0) return res.json({ message: 'No settings to update' });

        for (const key of keys) {
            const val = updates[key];
            if (val !== undefined) {
                await pool.query(
                    'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                    [key, val, val]
                );
            }
        }

        res.json({ message: 'Settings saved' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

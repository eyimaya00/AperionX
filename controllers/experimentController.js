const pool = require('../config/db');

exports.getAllExperiments = async (req, res) => {
    try {
        const [experiments] = await pool.query("SELECT id, title, slug, excerpt, objective, image_url, category, created_at, views, author_id, tags FROM experiments WHERE status = 'published' ORDER BY created_at DESC");

        if (experiments.length > 0) {
            const expIds = experiments.map(e => e.id);

            const [allAuthors] = await pool.query(`
                SELECT ea.experiment_id, u.id, u.fullname, u.username, u.avatar_url 
                FROM experiment_authors ea
                JOIN users u ON ea.user_id = u.id
                WHERE ea.experiment_id IN (?)
                ORDER BY ea.order_index ASC
            `, [expIds]);

            const authorMap = {};
            allAuthors.forEach(row => {
                if (!authorMap[row.experiment_id]) authorMap[row.experiment_id] = [];
                authorMap[row.experiment_id].push({ id: row.id, fullname: row.fullname, username: row.username, avatar_url: row.avatar_url });
            });

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
                const [legacyUsers] = await pool.query('SELECT id, fullname, username, avatar_url FROM users WHERE id IN (?)', [legacyIds]);
                const legacyMap = {};
                legacyUsers.forEach(u => legacyMap[u.id] = u);
                experiments.forEach(e => {
                    if (e.authors.length === 0 && e.author_id && legacyMap[e.author_id]) {
                        const u = legacyMap[e.author_id];
                        e.authors = [{ id: u.id, fullname: u.fullname, username: u.username, avatar_url: u.avatar_url }];
                        e.author_name = u.fullname;
                    }
                });
            }
        }

        res.json(experiments);
    } catch (e) {
        console.error('API Experiments Error:', e);
        res.status(500).send(e.toString());
    }
};

exports.getCategories = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT DISTINCT category FROM experiments WHERE status = 'published' AND category IS NOT NULL AND category != '' ORDER BY category ASC");
        res.json(rows.map(r => r.category));
    } catch (e) {
        console.error('Experiment Categories Error:', e);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};

exports.getMyExperiments = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT *
            FROM experiments 
            WHERE author_id = ? AND status != 'trash'
            ORDER BY created_at DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getMyTrashExperiments = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT *
            FROM experiments 
            WHERE author_id = ? AND status = 'trash'
            ORDER BY created_at DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createExperiment = async (req, res) => {
    const body = req.body || {};
    console.log("POST /api/experiments body:", body);
    const { title, category, objective, materials, procedure_steps, results, conclusion, excerpt, status, tags, references_list, youtube_url, safety_notes } = body;
    let author_ids = body.author_ids;

    if (typeof author_ids === 'string') {
        try { author_ids = JSON.parse(author_ids); } catch (e) { }
    }
    if (!Array.isArray(author_ids)) author_ids = [req.user.id];

    let image_url = null;
    let pdf_url = null;

    if (req.files) {
        const imgFile = req.files.find(f => f.fieldname === 'image');
        const pdfFile = req.files.find(f => f.fieldname === 'pdf');
        if (imgFile) image_url = 'uploads/' + imgFile.filename;
        if (pdfFile) pdf_url = 'uploads/' + pdfFile.filename;
    }

    let finalStatus = status;
    if (status === 'published' && req.user.role !== 'admin' && req.user.role !== 'editor') {
        finalStatus = 'pending';
    }

    try {
        const slug = await req.getUniqueExperimentSlug(pool, title);

        const [insertResult] = await pool.query(
            `INSERT INTO experiments (title, slug, category, objective, materials, procedure_steps, results, conclusion, excerpt, image_url, youtube_url, safety_notes, author_id, status, tags, references_list, pdf_url) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, slug, category, objective, materials, procedure_steps, results, conclusion, excerpt, image_url, youtube_url, safety_notes, req.user.id, finalStatus, tags, references_list, pdf_url]
        );

        const newExpId = insertResult.insertId;

        if (author_ids && author_ids.length > 0) {
            const authorValues = author_ids.map((uid, index) => [newExpId, uid, index]);
            await pool.query('INSERT INTO experiment_authors (experiment_id, user_id, order_index) VALUES ?', [authorValues]);
        }

        // Notify editors if pending
        if (finalStatus === 'pending') {
            try {
                const [authorUser] = await pool.query('SELECT fullname FROM users WHERE id = ?', [req.user.id]);
                const aName = authorUser[0]?.fullname || 'Bir Yazar';
                const [destUsers] = await pool.query("SELECT id FROM users WHERE role IN ('editor', 'admin')");
                const msg = `Yeni deney onayı bekliyor: ${title.substring(0, 30)}... - ${aName}`;
                for (const u of destUsers) {
                    if (u.id !== req.user.id) {
                        await req.createNotification(u.id, msg, 'info');
                    }
                }
            } catch (notifErr) { console.error('Exp Notif failed:', notifErr); }
        }

        res.status(201).json({ message: 'Experiment created', status: finalStatus });
    } catch (e) {
        console.error('Create Experiment Error:', e);
        res.status(500).send(e.toString());
    }
};

exports.updateExperiment = async (req, res) => {
    const expId = req.params.id;
    try {
        const [check] = await pool.query('SELECT * FROM experiments WHERE id = ?', [expId]);
        if (check.length === 0) return res.status(404).json({ message: 'Not found' });
        // The checkRole middleware handles general role verification, but ownership check is still needed for authors
        if (check[0].author_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);

        const existing = check[0];
        const body = req.body || {};
        console.log("PUT /api/experiments/:id body:", body);
        const { title, category, objective, materials, procedure_steps, results, conclusion, excerpt, status, tags, references_list, youtube_url, safety_notes } = body;

        let image_url = existing.image_url;
        let pdf_url = existing.pdf_url;

        if (req.files && Array.isArray(req.files)) {
            const imgFile = req.files.find(f => f.fieldname === 'image');
            const pdfFile = req.files.find(f => f.fieldname === 'pdf');
            if (imgFile) image_url = 'uploads/' + imgFile.filename;
            if (pdfFile) pdf_url = 'uploads/' + pdfFile.filename;
        }

        let finalStatus = status;
        if (status === 'published' && req.user.role !== 'admin' && req.user.role !== 'editor') {
            finalStatus = 'pending';
        }

        const slug = await req.getUniqueExperimentSlug(pool, title, expId);

        await pool.query(
            `UPDATE experiments SET title=?, slug=?, category=?, objective=?, materials=?, procedure_steps=?, results=?, conclusion=?, excerpt=?, image_url=?, youtube_url=?, safety_notes=?, status=?, tags=?, references_list=?, pdf_url=? WHERE id=?`,
            [title, slug, category, objective, materials, procedure_steps, results, conclusion, excerpt, image_url, youtube_url, safety_notes, finalStatus, tags, references_list, pdf_url, expId]
        );

        // Update authors if provided
        let author_ids = body.author_ids;
        if (typeof author_ids === 'string') {
            try { author_ids = JSON.parse(author_ids); } catch (e) { }
        }
        if (Array.isArray(author_ids)) {
            await pool.query('DELETE FROM experiment_authors WHERE experiment_id = ?', [expId]);
            if (author_ids.length > 0) {
                const authorValues = author_ids.map((uid, index) => [expId, uid, index]);
                await pool.query('INSERT INTO experiment_authors (experiment_id, user_id, order_index) VALUES ?', [authorValues]);
            }
        }

        res.json({ message: 'Experiment updated', status: finalStatus });
    } catch (e) {
        console.error('Update Experiment Error:', e);
        res.status(500).json({ error: e.message });
    }
};

exports.deleteExperiment = async (req, res) => {
    const expId = req.params.id;
    try {
        const [check] = await pool.query('SELECT author_id FROM experiments WHERE id = ?', [expId]);
        if (check.length === 0) return res.status(404).json({ message: 'Not found' });
        // Ownership check
        if (check[0].author_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);

        // Soft delete: move to trash instead of hard delete
        await pool.query("UPDATE experiments SET status = 'trash' WHERE id = ?", [expId]);
        res.json({ message: 'Experiment moved to trash' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.restoreExperiment = async (req, res) => {
    const expId = req.params.id;
    try {
        const [check] = await pool.query('SELECT author_id FROM experiments WHERE id = ?', [expId]);
        if (check.length === 0) return res.status(404).json({ message: 'Not found' });
        if (check[0].author_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);

        await pool.query("UPDATE experiments SET status = 'draft' WHERE id = ?", [expId]);
        res.json({ message: 'Experiment restored to draft' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.permanentDeleteExperiment = async (req, res) => {
    const expId = req.params.id;
    try {
        const [check] = await pool.query('SELECT author_id FROM experiments WHERE id = ?', [expId]);
        if (check.length === 0) return res.status(404).json({ message: 'Not found' });
        if (check[0].author_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);

        await pool.query('DELETE FROM experiment_authors WHERE experiment_id = ?', [expId]);
        await pool.query('DELETE FROM experiments WHERE id = ?', [expId]);
        res.json({ message: 'Experiment permanently deleted' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.decideExperiment = async (req, res) => {
    // checkRole ensures only admin/editor gets here
    const expId = req.params.id;
    const { decision, rejection_reason } = req.body;

    try {
        const [rows] = await pool.query('SELECT author_id, title FROM experiments WHERE id = ?', [expId]);
        if (rows.length === 0) return res.status(404).json({ message: 'Experiment not found' });

        const authorId = rows[0].author_id;
        const title = rows[0].title;

        let status = '';
        let msg = '';
        let type = '';
        let updateQuery = '';
        let queryParams = [];

        if (decision === 'approve') {
            status = 'published';
            msg = `Deneyiniz yayına alındı: ${title}`;
            type = 'success';
            updateQuery = "UPDATE experiments SET status = 'published', rejection_reason = NULL, approved_by = ? WHERE id = ?";
            queryParams = [req.user.id, expId];
        } else if (decision === 'reject') {
            status = 'rejected';
            msg = `Deneyiniz reddedildi: ${title}. ${rejection_reason ? 'Sebep: ' + rejection_reason : ''}`;
            type = 'error';
            updateQuery = "UPDATE experiments SET status = 'rejected', rejection_reason = ? WHERE id = ?";
            queryParams = [rejection_reason, expId];
        } else {
            return res.status(400).json({ message: 'Invalid decision' });
        }

        await pool.query(updateQuery, queryParams);

        // Notify Author
        await req.createNotification(authorId, msg, type);

        res.json({ message: `Experiment ${status}` });

    } catch (e) {
        console.error('Experiment Decision Error:', e);
        res.status(500).json({ error: e.message });
    }
};

exports.getAllExperimentsEditor = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT e.*, u.fullname as author_name 
            FROM experiments e 
            LEFT JOIN users u ON e.author_id = u.id 
            ORDER BY e.created_at DESC
        `);
        res.json(rows);
    } catch (e) {
        console.error('All Experiments Error:', e);
        res.status(500).json({ error: e.message });
    }
};

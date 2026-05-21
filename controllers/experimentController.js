const pool = require('../config/db');

// ==========================================
// PUBLIC & EDITOR METHODS (PRESERVED)
// ==========================================
exports.getAllExperiments = async (req, res) => {
    try {
        const [experiments] = await pool.query("SELECT id, title, slug, excerpt, objective, image_url, category, created_at, views, author_id, tags FROM experiments WHERE status = 'published' ORDER BY created_at DESC");

        if (experiments.length > 0) {
            const expIds = experiments.map(e => e.id);
            const [allAuthors] = await pool.query(`
                SELECT ea.experiment_id, u.id, u.fullname, u.username, u.avatar_url 
                FROM experiment_authors ea JOIN users u ON ea.user_id = u.id WHERE ea.experiment_id IN (?) ORDER BY ea.order_index ASC
            `, [expIds]);
            const authorMap = {};
            allAuthors.forEach(row => {
                if (!authorMap[row.experiment_id]) authorMap[row.experiment_id] = [];
                authorMap[row.experiment_id].push({ id: row.id, fullname: row.fullname, username: row.username, avatar_url: row.avatar_url });
            });
            experiments.forEach(e => {
                e.authors = authorMap[e.id] || [];
                if (e.authors.length > 0) { e.author_name = e.authors[0].fullname; e.author_username = e.authors[0].username; }
            });
        }
        res.json(experiments);
    } catch (e) { res.status(500).send(e.toString()); }
};

exports.getCategories = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT DISTINCT category FROM experiments WHERE status = 'published' AND category IS NOT NULL AND category != '' ORDER BY category ASC");
        res.json(rows.map(r => r.category));
    } catch (e) { res.status(500).send(e.toString()); }
};

exports.getAllExperimentsEditor = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT e.*, u.fullname as author_name, u.username as author_username 
            FROM experiments e LEFT JOIN users u ON e.author_id = u.id 
            ORDER BY e.created_at DESC
        `);
        res.json(rows);
    } catch (e) { res.status(500).send(e.toString()); }
};

exports.decideExperiment = async (req, res) => {
    const { decision, rejection_reason } = req.body;
    try {
        if (decision === 'approve') {
            await pool.query("UPDATE experiments SET status = 'published', approved_by = ?, rejection_reason = NULL WHERE id = ?", [req.user.id, req.params.id]);
        } else if (decision === 'reject') {
            await pool.query("UPDATE experiments SET status = 'rejected', rejection_reason = ? WHERE id = ?", [rejection_reason || 'Belirtilmedi', req.params.id]);
        }
        res.json({ message: 'Success' });
    } catch (e) { res.status(500).send(e.toString()); }
};

// ==========================================
// COMPLETELY REWRITTEN AUTHOR METHODS
// ==========================================

exports.getExperiments = async (req, res) => {
    try {
        const statusFilter = req.query.status || 'all';
        let query = "SELECT * FROM experiments WHERE author_id = ?";
        const params = [req.user.id];

        if (statusFilter === 'published') {
            query += " AND status = 'published'";
        } else if (statusFilter === 'draft') {
            query += " AND status = 'draft'";
        } else if (statusFilter === 'trash') {
            query += " AND status = 'trash'";
        } else {
            // Tümü (Taslaklar vs dahil, ama trash HARIÇ)
            query += " AND status != 'trash'";
        }
        
        query += " ORDER BY created_at DESC";
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
};

exports.createExperiment = async (req, res) => {
    try {
        const body = req.body || {};
        const title = body.title || 'Başlıksız Deney';
        const category = body.category || '';
        const objective = body.objective || '';
        const materials = body.materials || '';
        const procedure_steps = body.procedure_steps || '';
        const results = body.results || '';
        const conclusion = body.conclusion || '';
        const excerpt = body.excerpt || '';
        let status = body.status === 'published' ? 'pending' : 'draft'; // Author cannot publish directly
        const tags = body.tags || '';
        const references_list = body.references_list || '';
        const youtube_url = body.youtube_url || '';
        const safety_notes = body.safety_notes || '';
        
        let image_url = null;
        let pdf_url = null;

        if (req.files) {
            if (req.files.image && req.files.image[0]) image_url = 'uploads/' + req.files.image[0].filename;
            if (req.files.pdf && req.files.pdf[0]) pdf_url = 'uploads/' + req.files.pdf[0].filename;
        }

        const slug = await req.getUniqueExperimentSlug(pool, title);

        const [insertResult] = await pool.query(
            `INSERT INTO experiments (title, slug, category, objective, materials, procedure_steps, results, conclusion, excerpt, image_url, youtube_url, safety_notes, author_id, status, tags, references_list, pdf_url) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, slug, category, objective, materials, procedure_steps, results, conclusion, excerpt, image_url, youtube_url, safety_notes, req.user.id, status, tags, references_list, pdf_url]
        );

        let author_ids = body.author_ids;
        if (typeof author_ids === 'string') {
            try { author_ids = JSON.parse(author_ids); } catch (e) { }
        }
        if (Array.isArray(author_ids) && author_ids.length > 0) {
            const authorValues = author_ids.map((uid, index) => [insertResult.insertId, uid, index]);
            await pool.query('INSERT INTO experiment_authors (experiment_id, user_id, order_index) VALUES ?', [authorValues]);
        }

        res.status(201).json({ message: 'Experiment created', id: insertResult.insertId, status: status });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.updateExperiment = async (req, res) => {
    try {
        const expId = req.params.id;
        const [check] = await pool.query('SELECT * FROM experiments WHERE id = ?', [expId]);
        if (check.length === 0) return res.status(404).json({ message: 'Not found' });
        
        const existing = check[0];
        if (existing.author_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'editor') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const body = req.body || {};
        const title = body.title !== undefined ? body.title : existing.title;
        const category = body.category !== undefined ? body.category : existing.category;
        const objective = body.objective !== undefined ? body.objective : existing.objective;
        const materials = body.materials !== undefined ? body.materials : existing.materials;
        const procedure_steps = body.procedure_steps !== undefined ? body.procedure_steps : existing.procedure_steps;
        const results = body.results !== undefined ? body.results : existing.results;
        const conclusion = body.conclusion !== undefined ? body.conclusion : existing.conclusion;
        const excerpt = body.excerpt !== undefined ? body.excerpt : existing.excerpt;
        const tags = body.tags !== undefined ? body.tags : existing.tags;
        const references_list = body.references_list !== undefined ? body.references_list : existing.references_list;
        const youtube_url = body.youtube_url !== undefined ? body.youtube_url : existing.youtube_url;
        const safety_notes = body.safety_notes !== undefined ? body.safety_notes : existing.safety_notes;
        
        let status = body.status !== undefined ? body.status : existing.status;
        if (status === 'published' && req.user.role !== 'admin' && req.user.role !== 'editor') {
            status = 'pending';
        }

        let image_url = existing.image_url;
        let pdf_url = existing.pdf_url;

        if (req.files) {
            if (req.files.image && req.files.image[0]) image_url = 'uploads/' + req.files.image[0].filename;
            if (req.files.pdf && req.files.pdf[0]) pdf_url = 'uploads/' + req.files.pdf[0].filename;
        }

        const slug = await req.getUniqueExperimentSlug(pool, title, expId);

        await pool.query(
            `UPDATE experiments SET title=?, slug=?, category=?, objective=?, materials=?, procedure_steps=?, results=?, conclusion=?, excerpt=?, image_url=?, youtube_url=?, safety_notes=?, status=?, tags=?, references_list=?, pdf_url=? WHERE id=?`,
            [title, slug, category, objective, materials, procedure_steps, results, conclusion, excerpt, image_url, youtube_url, safety_notes, status, tags, references_list, pdf_url, expId]
        );

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

        res.json({ message: 'Experiment updated', status: status });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.softDeleteExperiment = async (req, res) => {
    try {
        const expId = req.params.id;
        const [check] = await pool.query('SELECT author_id FROM experiments WHERE id = ?', [expId]);
        if (check.length === 0) return res.status(404).json({ message: 'Not found' });
        if (check[0].author_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);

        await pool.query("UPDATE experiments SET status = 'trash' WHERE id = ?", [expId]);
        res.json({ message: 'Experiment moved to trash' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.restoreExperiment = async (req, res) => {
    try {
        const expId = req.params.id;
        const [check] = await pool.query('SELECT author_id FROM experiments WHERE id = ?', [expId]);
        if (check.length === 0) return res.status(404).json({ message: 'Not found' });
        if (check[0].author_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);

        await pool.query("UPDATE experiments SET status = 'draft' WHERE id = ?", [expId]);
        res.json({ message: 'Experiment restored to draft' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.permanentDeleteExperiment = async (req, res) => {
    try {
        const expId = req.params.id;
        const [check] = await pool.query('SELECT author_id FROM experiments WHERE id = ?', [expId]);
        if (check.length === 0) return res.status(404).json({ message: 'Not found' });
        if (check[0].author_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'editor') return res.sendStatus(403);

        await pool.query('DELETE FROM experiment_authors WHERE experiment_id = ?', [expId]);
        await pool.query('DELETE FROM experiments WHERE id = ?', [expId]);
        res.json({ message: 'Experiment permanently deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

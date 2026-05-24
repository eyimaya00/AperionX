
// === SETTINGS API ===

// GET Settings
app.get('/api/settings', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM settings');
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        res.json(settings);
    } catch (e) {
        console.error('Settings Fetch Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// SAVE Settings (Admin Only)
app.post('/api/settings', authenticateToken, upload.fields([
    { name: 'site_logo', maxCount: 1 },
    { name: 'site_favicon', maxCount: 1 },
    { name: 'about_us_image', maxCount: 1 }
]), async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);

    try {
        const settings = req.body;
        const files = req.files || {};

        // Handle File Uploads
        if (files.site_logo) settings.site_logo = '/uploads/' + files.site_logo[0].filename;
        if (files.site_favicon) settings.site_favicon = '/uploads/' + files.site_favicon[0].filename;
        if (files.about_us_image) settings.about_us_image = '/uploads/' + files.about_us_image[0].filename;

        // Save each setting
        for (const [key, value] of Object.entries(settings)) {
            // Upsert
            await pool.query(`
                INSERT INTO settings (setting_key, setting_value) 
                VALUES (?, ?) 
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
            `, [key, value]);
        }

        res.json({ message: 'Ayarlar başarıyla kaydedildi' });

    } catch (e) {
        console.error('Settings Save Error:', e);
        res.status(500).json({ error: e.message });
    }
});

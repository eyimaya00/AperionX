const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'aperionx'
        });

        try { await pool.query('ALTER TABLE experiments ADD COLUMN published_at TIMESTAMP NULL'); } catch(e) {}

        const testTitles = [
            'Bakır Sülfatın Kristallendirme Yöntemi ile Saflaştırılması',
            'Ispanak Yapraklarından Kloroplast İzolasyonu',
            'Sütten Yapıştırıcı Elde Edilmesi',
            'İn Vitro Memeli Hücre Kültür Teknikleri Vol-1 \'\'Hücre Çözme\'\'',
            'Bitkisel Yağlardan Sabun Sentezi',
            'İnsan Periferik Kan Lenfosit Kültürü ile Karyotip Analizi ve GTG Bantlama Yöntemi'
        ];

        for (const title of testTitles) {
            const [existing] = await pool.query('SELECT id FROM experiments WHERE title = ?', [title]);
            if (existing.length === 0) {
                await pool.query('INSERT INTO experiments (title, slug, status, excerpt) VALUES (?, ?, ?, ?)', [title, title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), 'published', title]);
            }
        }

        const experimentDateFixes = [
            { pattern: '%Bakır Sülfat%', date: '2026-07-01 12:00:00' },
            { pattern: '%Kloroplast%', date: '2026-07-02 12:00:00' },
            { pattern: '%Sütten%', date: '2026-07-03 12:00:00' },
            { pattern: '%İn Vitro%', date: '2026-07-04 12:00:00' },
            { pattern: '%Sabun%', date: '2026-07-05 12:00:00' },
            { pattern: '%Lenfosit%', date: '2026-07-06 12:00:00' }
        ];

        for (const fix of experimentDateFixes) {
            await pool.query(
                "UPDATE experiments SET created_at = ?, published_at = ? WHERE title LIKE ? OR slug LIKE ?",
                [fix.date, fix.date, fix.pattern, fix.pattern]
            );
        }

        const [rows] = await pool.query("SELECT id, title, published_at FROM experiments WHERE status = 'published' AND deleted_at IS NULL ORDER BY COALESCE(published_at, created_at) DESC, id DESC");
        console.log('\n--- RESULTING EXPERIMENT LISTING ORDER ON /experiments (NEWEST FIRST) ---');
        rows.forEach((r, idx) => console.log(`${idx + 1}. [Date: ${new Date(r.published_at).toISOString().split('T')[0]}] ${r.title}`));

        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
})();

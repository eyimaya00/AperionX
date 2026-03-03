const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'aperionx_db'
    });

    try {
        // Üye sayısı
        const [users] = await pool.query('SELECT COUNT(*) as total FROM users');
        console.log('=== TOPLAM ÜYE:', users[0].total, '===');

        // Role dağılımı
        const [roles] = await pool.query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
        console.log('\nRole dağılımı:');
        roles.forEach(r => console.log(`  ${r.role}: ${r.count}`));

        // Makale sayısı
        const [articles] = await pool.query('SELECT COUNT(*) as total FROM articles');
        console.log('\nToplam makale:', articles[0].total);

        const [published] = await pool.query("SELECT COUNT(*) as total FROM articles WHERE status='published'");
        console.log('Yayınlanan makale:', published[0].total);

        // Deney sayısı
        try {
            const [experiments] = await pool.query('SELECT COUNT(*) as total FROM experiments');
            console.log('Toplam deney:', experiments[0].total);
        } catch (e) { console.log('Deney tablosu yok'); }

        // Son 10 üye
        const [recent] = await pool.query('SELECT id, fullname, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 10');
        console.log('\n=== SON 10 ÜYE ===');
        recent.forEach(u => {
            const date = new Date(u.created_at).toLocaleString('tr-TR');
            console.log(`  ID:${u.id} | ${u.fullname} | ${u.email} | ${u.role} | ${date}`);
        });

        // Son 5 makale
        const [lastArticles] = await pool.query('SELECT id, title, status, created_at FROM articles ORDER BY created_at DESC LIMIT 5');
        console.log('\n=== SON 5 MAKALE ===');
        lastArticles.forEach(a => {
            const date = new Date(a.created_at).toLocaleString('tr-TR');
            console.log(`  ID:${a.id} | ${a.title} | ${a.status} | ${date}`);
        });

        // En eski ve en yeni kayıt tarihleri
        const [oldest] = await pool.query('SELECT MIN(created_at) as oldest, MAX(created_at) as newest FROM users');
        console.log('\n=== TARİH ARALIĞI ===');
        console.log('En eski üye:', new Date(oldest[0].oldest).toLocaleString('tr-TR'));
        console.log('En yeni üye:', new Date(oldest[0].newest).toLocaleString('tr-TR'));

        const [oldestArt] = await pool.query('SELECT MIN(created_at) as oldest, MAX(created_at) as newest FROM articles');
        console.log('En eski makale:', new Date(oldestArt[0].oldest).toLocaleString('tr-TR'));
        console.log('En yeni makale:', new Date(oldestArt[0].newest).toLocaleString('tr-TR'));

    } catch (e) {
        console.error('HATA:', e.message);
    } finally {
        await pool.end();
    }
})();

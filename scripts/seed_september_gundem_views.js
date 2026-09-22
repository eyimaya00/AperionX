const mysql = require('mysql2/promise');
require('dotenv').config();

async function seedSeptemberGundemViews() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'aperionx_db'
    });

    try {
        console.log('--- EYLÜL AYI GÜNDEM OKUNMALARI ENTEGRASYONU ---');

        // 1. Mevcut yayınlanmış bir gündem haberi var mı kontrol et
        let [gundemArticles] = await conn.query(
            "SELECT id, title, views FROM articles WHERE is_gundem = 1 AND status = 'published' ORDER BY id ASC LIMIT 1"
        );

        let gundemId;

        if (gundemArticles.length === 0) {
            console.log('Gündem haberi bulunamadı, Eylül 2026 için yayınlanmış gündem haberi oluşturuluyor...');
            const [authorRows] = await conn.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
            const authorId = authorRows.length > 0 ? authorRows[0].id : 1;

            const [insertResult] = await conn.query(`
                INSERT INTO articles (
                    title, slug, category, excerpt, content, image_url, 
                    status, is_gundem, views, author_id, published_at, created_at
                ) VALUES (
                    'Bilim ve Teknoloji Dünyasından Güncel Gelişmeler',
                    'bilim-ve-teknoloji-dunyasindan-guncel-gelismeler',
                    'Gündem',
                    'AperionX Bilim Masası tarafından derlenen haftanın ve ayın öne çıkan bilimsel keşifleri ve teknolojik atılımları.',
                    '<p>AperionX Bilim Gündemi: Dünyadan ve Türkiye\\'den en güncel bilim haberleri, son dakika teknolojik keşifler ve gelişmeler.</p>',
                    '/uploads/logo.png',
                    'published',
                    1,
                    186,
                    ?,
                    '2026-09-01 10:00:00',
                    '2026-09-01 10:00:00'
                )
            `, [authorId]);

            gundemId = insertResult.insertId;
            console.log(`Yeni Gündem haberi oluşturuldu (ID: ${gundemId}).`);
        } else {
            gundemId = gundemArticles[0].id;
            console.log(`Mevcut Gündem haberi kullanılıyor (ID: ${gundemId}, Başlık: "${gundemArticles[0].title}").`);
            
            // Haberin okunma sayısını en az 186 olarak güncelle
            await conn.query("UPDATE articles SET views = GREATEST(views, 186) WHERE id = ?", [gundemId]);
        }

        // 2. Eylül 2026 için article_views tablosunda mevcut gündem okunmalarını say
        const [existingViews] = await conn.query(`
            SELECT COUNT(*) as count 
            FROM article_views 
            WHERE article_id = ? AND viewed_at >= '2026-09-01 00:00:00' AND viewed_at <= '2026-09-30 23:59:59'
        `, [gundemId]);

        const currentSeptemberCount = existingViews[0].count;
        console.log(`Eylül 2026 mevcut loglanan gündem okunması: ${currentSeptemberCount}`);

        const targetCount = 186;
        const needed = targetCount - currentSeptemberCount;

        if (needed > 0) {
            console.log(`${needed} adet Eylül ayı zaman damgalı okunma kaydı ekleniyor...`);

            const rowsToInsert = [];
            // Eylül 1 ile Eylül 23 arasına homojen dağıt
            const startTimestamp = new Date('2026-09-01T08:00:00').getTime();
            const endTimestamp = new Date('2026-09-23T01:30:00').getTime();
            const timeRange = endTimestamp - startTimestamp;

            for (let i = 0; i < needed; i++) {
                // Rastgele zaman damgası
                const randTime = new Date(startTimestamp + Math.floor(Math.random() * timeRange));
                const timeStr = randTime.toISOString().slice(0, 19).replace('T', ' ');

                // Rastgele IP adresi
                const ip = `176.234.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;

                rowsToInsert.push([gundemId, ip, timeStr]);
            }

            // Toplu insert (1000'lik chunklar halinde)
            const chunkSize = 500;
            for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
                const chunk = rowsToInsert.slice(i, i + chunkSize);
                await conn.query('INSERT INTO article_views (article_id, ip_address, viewed_at) VALUES ?', [chunk]);
            }

            console.log(`✅ Başarıyla ${needed} adet okunma kaydı eklendi.`);
        } else {
            console.log('Eylül ayı için zaten 186 veya üzeri okunma kaydı mevcut.');
        }

        // 3. Güncel durumu doğrula
        const [finalStats] = await conn.query(`
            SELECT DATE_FORMAT(v.viewed_at, '%Y-%m') as month, COUNT(*) as gundem_views
            FROM article_views v
            JOIN articles a ON v.article_id = a.id
            WHERE a.is_gundem = 1 AND v.viewed_at >= '2026-09-01 00:00:00'
            GROUP BY month
        `);
        console.log('\n--- DOĞRULAMA SONUCU ---');
        console.log(finalStats);

        const [artRow] = await conn.query("SELECT id, title, views FROM articles WHERE id = ?", [gundemId]);
        console.log(`Haber Güncel Sayacı: ID ${artRow[0].id} -> ${artRow[0].views} okunma`);

    } catch (err) {
        console.error('Hata:', err.message);
    } finally {
        await conn.end();
    }
}

seedSeptemberGundemViews();

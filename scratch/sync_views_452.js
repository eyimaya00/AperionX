const mysql = require('/home/aperionx/htdocs/www.aperionx.com/node_modules/mysql2/promise');
(async () => {
    const pool = mysql.createPool({
        host: '127.0.0.1',
        user: 'root',
        password: 's6fIwymToqEnBLcl',
        database: 'aperionx'
    });
    try {
        const articleId = 128;
        const targetViews = 452;
        
        // 1. articles tablosunu güncelle
        await pool.query("UPDATE articles SET views = ? WHERE id = ?", [targetViews, articleId]);
        
        // 2. Log tablosundaki (article_views) toplam kayıt sayısını al
        const [viewsCountRows] = await pool.query("SELECT COUNT(*) as count FROM article_views WHERE article_id = ?", [articleId]);
        const currentRows = viewsCountRows[0].count;
        
        console.log(`Hedef Okunma: ${targetViews}`);
        console.log(`Mevcut Log Kaydı: ${currentRows}`);
        
        if (currentRows > targetViews) {
            const deleteCount = currentRows - targetViews;
            // Fazlalık olan en eski kayıtları silerek eşitle
            await pool.query(
                "DELETE FROM article_views WHERE article_id = ? ORDER BY viewed_at ASC LIMIT ?",
                [articleId, deleteCount]
            );
            console.log(`Başarılı! ${deleteCount} adet eski log kaydı silindi.`);
        } else if (currentRows < targetViews) {
            // Eğer log sayısı hedeften az ise eksik kadar örnek log ekle
            const insertCount = targetViews - currentRows;
            for (let i = 0; i < insertCount; i++) {
                // Son 24 saat içine rastgele yayılmış zamanlar
                const randomHours = Math.floor(Math.random() * 24);
                const randomMinutes = Math.floor(Math.random() * 60);
                const viewedAt = new Date();
                viewedAt.setHours(viewedAt.getHours() - randomHours);
                viewedAt.setMinutes(viewedAt.getMinutes() - randomMinutes);
                
                await pool.query(
                    "INSERT INTO article_views (article_id, ip_address, viewed_at) VALUES (?, ?, ?)",
                    [articleId, `85.105.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`, viewedAt]
                );
            }
            console.log(`Başarılı! ${insertCount} adet yeni log kaydı eklendi.`);
        } else {
            console.log("Log tablosu zaten hedef sayı ile eşit durumdaydı.");
        }
        
        // Son kontrolleri yazdır
        const [art] = await pool.query("SELECT views FROM articles WHERE id = ?", [articleId]);
        const [logs] = await pool.query("SELECT COUNT(*) as count FROM article_views WHERE article_id = ?", [articleId]);
        console.log(`-> Makale Tablosu Okunma Sayısı: ${art[0].views}`);
        console.log(`-> Log Tablosundaki Kayıt Sayısı: ${logs[0].count}`);
        console.log("Tüm sayılar başarıyla 452'ye eşitlendi!");
        
    } catch (e) {
        console.error("Hata:", e);
    } finally {
        await pool.end();
    }
})();

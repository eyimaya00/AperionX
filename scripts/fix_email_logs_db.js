const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/../.env' });

async function fixDB() {
    console.log('Veritabanına bağlanılıyor...');
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER,
        password: process.env.DB_PASS || process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Tablo güncelleniyor...');
        await pool.query("ALTER TABLE email_logs MODIFY COLUMN status ENUM('sent', 'failed', 'partial') DEFAULT 'sent'");
        console.log('✅ BAŞARILI: Tablo başarıyla güncellendi!');
    } catch (e) {
        console.error('❌ HATA:', e.message);
    } finally {
        pool.end();
    }
}

fixDB();

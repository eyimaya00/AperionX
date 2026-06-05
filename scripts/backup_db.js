const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const backupDir = path.join(__dirname, '..', 'backups');

// Yedekleme klasörünü oluştur
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

// Dosya adını tarih ve saat ile oluştur (Örn: yedek_2026-06-05_14-30.sql)
const date = new Date();
const timestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;
const fileName = `yedek_${timestamp}.sql`;
const filePath = path.join(backupDir, fileName);

const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS || process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;

// mysqldump komutu (-h ile TCP üzerinden bağlanmaya zorlar, socket hatasını aşar)
const dumpCommand = `mysqldump -h ${dbHost} -u ${dbUser} -p"${dbPass}" ${dbName} > ${filePath}`;

console.log(`[YEDEKLEME BAŞLADI] ${fileName} oluşturuluyor...`);

exec(dumpCommand, (error, stdout, stderr) => {
    if (error) {
        console.error(`[HATA] Yedekleme başarısız: ${error.message}`);
        return;
    }
    console.log(`[BAŞARILI] Veritabanı yedeği alındı: ${filePath}`);

    // İsteğe bağlı: Eski yedekleri silme (Sadece son 7 yedeği tutar)
    cleanOldBackups();
});

function cleanOldBackups() {
    fs.readdir(backupDir, (err, files) => {
        if (err) return;
        const sqlFiles = files.filter(f => f.endsWith('.sql')).sort().reverse();
        
        // 7'den fazla yedek varsa eskileri sil
        if (sqlFiles.length > 7) {
            const filesToDelete = sqlFiles.slice(7);
            filesToDelete.forEach(file => {
                fs.unlink(path.join(backupDir, file), err => {
                    if (!err) console.log(`[TEMİZLİK] Eski yedek silindi: ${file}`);
                });
            });
        }
    });
}

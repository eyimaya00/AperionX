import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { config } from './src/config';

async function uploadLocalVideosToDrive() {
    console.log('--- Yerel Videoları Google Drive\'a Yükleme Aracı ---');

    if (!config.drive.enabled || !config.drive.folderId) {
        console.error('HATA: .env dosyasında Drive ayarları (ENABLE_DRIVE_SYNC, DRIVE_FOLDER_ID) eksik.');
        process.exit(1);
    }

    const videosDir = path.resolve(__dirname, 'videos');
    if (!fs.existsSync(videosDir)) {
        console.error(`HATA: ${videosDir} klasörü bulunamadı.`);
        process.exit(1);
    }

    console.log('Google Drive\'a bağlanılıyor...');
    let driveClient;
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: config.drive.serviceAccountPath,
            scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
        });
        driveClient = google.drive({ version: 'v3', auth });
        console.log('Bağlantı başarılı!');
    } catch (error: any) {
        console.error('Yetkilendirme hatası:', error.message);
        process.exit(1);
    }

    // Klasördeki .mp4 dosyalarını bul
    const files = fs.readdirSync(videosDir).filter(f => f.toLowerCase().endsWith('.mp4'));

    if (files.length === 0) {
        console.log('Klasörde yüklenecek .mp4 dosyası bulunamadı.');
        process.exit(0);
    }

    console.log(`${files.length} adet .mp4 dosyası bulundu. Yükleme başlıyor...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
        const filename = files[i];
        const filePath = path.join(videosDir, filename);
        const stats = fs.statSync(filePath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(`[${i + 1}/${files.length}] Yükleniyor: ${filename} (${fileSizeMB} MB)`);

        try {
            const requestBody = {
                name: filename,
                parents: [config.drive.folderId],
            };

            console.log(`... İndirilen boyut ${fileSizeMB} MB, sürat için bekleniyor... (Bu adım birkaç dakika sürebilir)`);
            const media = {
                mimeType: 'video/mp4',
                body: fs.createReadStream(filePath),
            };

            const file = await driveClient.files.create({
                requestBody,
                media: media,
                fields: 'id',
            });

            console.log(` ✅ Başarılı! Drive ID: ${file.data.id}`);
            successCount++;
        } catch (error: any) {
            console.error(` ❌ HATA: ${filename} yüklenemedi`);
            console.error(`   Detay: ${error.message}`);
            if (error.message.includes('Google Drive API has not been used')) {
                console.error(`\n   LÜTFEN DİKKAT: Google Drive API henüz aktifleşmemiş olabilir.`);
                console.error(`   Bu linke tıklayarak API'yi projenize aktif ettiğinizden emin olun:`);
                console.error(`   https://console.cloud.google.com/apis/library/drive.googleapis.com?project=${config.drive.serviceAccountPath ? 'aperionx' : ''}`);
                console.error(`   (Eğer zaten aktif ettiyseniz, Google sunucularının bunu tüm dünyaya yayması 10-15 dakika sürebilir. Biraz bekleyip tekrar deneyin.)`);
                process.exit(1); // API kapalıysa diğerlerini de denemeye gerek yok
            }
            failCount++;
        }
    }

    console.log(`\nİşlem Tamamlandı! Toplam Yüklenen: ${successCount}, Başarısız: ${failCount}`);
}

uploadLocalVideosToDrive();

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const outputDir = path.resolve(__dirname, 'aperionx-export');
const filesToCopy = [
    'src/services/drive.service.ts',
    'src/services/ai.service.ts',
    'src/database/migrations/003_drive_files.sql',
    'service-account.json',
    '.env'
];

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Dosyaları kopyala
for (const file of filesToCopy) {
    const srcPath = path.resolve(__dirname, file);
    if (fs.existsSync(srcPath)) {
        const destPath = path.join(outputDir, path.basename(file));
        fs.copyFileSync(srcPath, destPath);
        console.log(`Kopyalandı: ${file} -> ${destPath}`);
    } else {
        console.warn(`Bulunamadı: ${file}`);
    }
}

// README dosyası oluştur
const readmeContent = `
# AperionX Google Drive + Multimodal AI Otomasyonu

Bu klasör, Google Drive videolarını otomatik çeken ve Gemini AI ile "izleyip" analiz eden sistemin kodlarını içerir.

## Dosyalar:
1. \`drive.service.ts\` -> \`src/services/\` klasörüne kopyalayın.
2. \`ai.service.ts\` -> \`src/services/\` klasörüne kopyalayın (mevcut olanı güncelleyin).
3. \`003_drive_files.sql\` -> Veritabanı (migration) olarak çalıştırın.
4. \`service-account.json\` -> Proje ana dizinine (ana klasöre) koyun.
5. \`.env\` -> İçindeki Drive ayarlarını kendi dosyanıza ekleyin.

## Kendi Projenizde Değiştirmeniz Gerekenler:

1. **\`scheduler.service.ts\`:**
   \`\`\`typescript
   import { DriveIntegrationService } from './services/drive.service';
   const driveService = new DriveIntegrationService();
   
   cron.schedule('0 */4 * * *', async () => {
       await driveService.syncVideos();
   });
   \`\`\`

## Yeni "Gören AI" Özelliği
Artık videolar Drive'a indiğinde sistem videoyu Gemini'ye gönderir. Gemini videoyu analiz ederek:
- En dikkat çekici başlığı oluşturur.
- Video içeriğine göre detaylı açıklama yazar.
- Trend olan 15 hashtag'i seçer.
Hepsini otomatik bir \`.txt\` dosyasına kaydeder.
`;

fs.writeFileSync(path.join(outputDir, 'README-AperionX.md'), readmeContent);
console.log('README oluşturuldu.');
console.log(`Tüm dosyalar C:\\Users\\eyima\\Otomasyon\\backend\\aperionx-export klasörüne kopyalandı.`);

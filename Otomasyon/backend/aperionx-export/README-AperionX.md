
# AperionX Google Drive + Multimodal AI Otomasyonu

Bu klasör, Google Drive videolarını otomatik çeken ve Gemini AI ile "izleyip" analiz eden sistemin kodlarını içerir.

## Dosyalar:
1. `drive.service.ts` -> `src/services/` klasörüne kopyalayın.
2. `ai.service.ts` -> `src/services/` klasörüne kopyalayın (mevcut olanı güncelleyin).
3. `003_drive_files.sql` -> Veritabanı (migration) olarak çalıştırın.
4. `service-account.json` -> Proje ana dizinine (ana klasöre) koyun.
5. `.env` -> İçindeki Drive ayarlarını kendi dosyanıza ekleyin.

## Kendi Projenizde Değiştirmeniz Gerekenler:

1. **`scheduler.service.ts`:**
   ```typescript
   import { DriveIntegrationService } from './services/drive.service';
   const driveService = new DriveIntegrationService();
   
   cron.schedule('0 */4 * * *', async () => {
       await driveService.syncVideos();
   });
   ```

## Yeni "Gören AI" Özelliği
Artık videolar Drive'a indiğinde sistem videoyu Gemini'ye gönderir. Gemini videoyu analiz ederek:
- En dikkat çekici başlığı oluşturur.
- Video içeriğine göre detaylı açıklama yazar.
- Trend olan 15 hashtag'i seçer.
Hepsini otomatik bir `.txt` dosyasına kaydeder.

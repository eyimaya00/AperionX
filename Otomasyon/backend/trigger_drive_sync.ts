import { DriveIntegrationService } from './src/services/drive.service';
import { logger } from './src/utils/logger';

async function main() {
    logger.info('🚀 Manuel Drive Senkronizasyonu başlatılıyor...');
    const driveService = new DriveIntegrationService();

    try {
        await driveService.syncVideos();
        logger.info('✅ Drive senkronizasyonu tamamlandı.');
    } catch (error: any) {
        logger.error('❌ Senkronizasyon sırasında hata oluştu:', error.message);
    }
}

main().catch(err => {
    console.error('Kritik hata:', err);
    process.exit(1);
});

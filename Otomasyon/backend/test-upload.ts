import { getDatabase, initDatabase } from './src/database';
import { VideoModel } from './src/models/video.model';
import { YouTubeAuthService } from './src/services/youtube-auth.service';
import { YouTubeUploadService } from './src/services/youtube-upload.service';
import path from 'path';
import { config } from './src/config';
import { logger } from './src/utils/logger';

async function testUpload() {
    initDatabase();

    console.log("--- TEST UPLOAD TRIGGERED ---");
    const readyVideos = VideoModel.findScheduledReady();
    console.log(`Bulunan hazir video sayisi: ${readyVideos.length}`);

    if (readyVideos.length === 0) {
        console.log("Test edilecek video yok.");
        return;
    }

    const authService = new YouTubeAuthService();
    const uploadService = new YouTubeUploadService(authService);

    const activeChannels = authService.getActiveChannels();
    if (activeChannels.length === 0) {
        console.log("Aktif kanal yok");
        return;
    }
    const activeChannelId = activeChannels[0].channel_id;

    const videoToUpload = readyVideos[0];
    console.log(`YUKLENIYOR: ${videoToUpload.title}`);

    try {
        const filePath = path.join(config.videosDir, videoToUpload.filename);
        const tags = videoToUpload.tags ? JSON.parse(videoToUpload.tags) : [];

        const result = await uploadService.uploadVideo(
            activeChannelId,
            filePath,
            {
                title: videoToUpload.title || videoToUpload.filename,
                description: videoToUpload.description || '',
                tags: tags,
                privacyStatus: 'private', // SADECE TEST ICIN PUBLIC YAPMIYORUZ
                shortsAutoLabel: true
            },
            videoToUpload.id
        );

        console.log("SONUC:", result);
    } catch (e: any) {
        console.log("HATA:", e.message);
    }
}

testUpload();

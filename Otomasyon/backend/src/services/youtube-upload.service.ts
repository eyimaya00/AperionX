import { google, youtube_v3 } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { LogModel } from '../models';
import { YouTubeAuthService } from './youtube-auth.service';
import { YouTubeVideoMetadata, YouTubeUploadResult } from './youtube.types';

/**
 * YouTube Upload Service
 *
 * Authenticated OAuth2Client üzerinden video yükleme.
 * Shorts optimizasyonu: #Shorts hashtag, dikey format desteği.
 *
 * Kullanım:
 *   const authService = new YouTubeAuthService();
 *   const uploadService = new YouTubeUploadService(authService);
 *   const result = await uploadService.uploadVideo(
 *     channelId,
 *     '/path/to/video.mp4',
 *     { title: 'My Short', description: '...', tags: ['test'], privacyStatus: 'public' },
 *     videoDbId  // opsiyonel — log için
 *   );
 */
export class YouTubeUploadService {
    private authService: YouTubeAuthService;

    constructor(authService: YouTubeAuthService) {
        this.authService = authService;
    }

    /**
     * Video yükle
     */
    async uploadVideo(
        channelId: string,
        filePath: string,
        metadata: YouTubeVideoMetadata,
        videoDbId?: number
    ): Promise<YouTubeUploadResult> {
        const logPrefix = videoDbId ? `[Video #${videoDbId}]` : '[Upload]';

        try {
            // 1. Dosya var mı kontrol et
            if (!fs.existsSync(filePath)) {
                throw new Error(`Video dosyası bulunamadı: ${filePath}`);
            }

            const fileSize = fs.statSync(filePath).size;
            logger.info(`${logPrefix} Upload başlıyor: ${path.basename(filePath)} (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);

            if (videoDbId) {
                LogModel.create(videoDbId, `YouTube upload başlıyor: ${metadata.title}`, 'info');
            }

            // 2. Authenticated client al
            const client = await this.authService.getAuthenticatedClient(channelId);
            const youtube = google.youtube({ version: 'v3', auth: client });

            // 3. Shorts için title'a #Shorts ekle
            let title = metadata.title;
            if (metadata.shortsAutoLabel && !title.toLowerCase().includes('#shorts')) {
                title = `${title} #Shorts`;
            }

            // 4. Upload isteği
            const response = await youtube.videos.insert({
                part: ['snippet', 'status'],
                requestBody: {
                    snippet: {
                        title,
                        description: metadata.description,
                        tags: metadata.tags,
                        categoryId: metadata.categoryId || '22', // People & Blogs
                    },
                    status: {
                        privacyStatus: metadata.privacyStatus,
                        selfDeclaredMadeForKids: metadata.madeForKids || false,
                    },
                },
                media: {
                    body: fs.createReadStream(filePath),
                },
            });

            const videoId = response.data.id;
            const videoUrl = `https://youtube.com/shorts/${videoId}`;

            logger.info(`${logPrefix} ✅ Upload başarılı: ${videoUrl}`);

            if (videoDbId) {
                LogModel.create(videoDbId, `YouTube upload başarılı: ${videoUrl}`, 'info');
            }

            return {
                success: true,
                videoId: videoId || undefined,
                videoUrl,
                channelId,
            };
        } catch (error: any) {
            const errorMsg = error.message || 'Bilinmeyen hata';
            logger.error(`${logPrefix} ❌ Upload hatası: ${errorMsg}`);

            if (videoDbId) {
                LogModel.create(videoDbId, `YouTube upload hatası: ${errorMsg}`, 'error');
            }

            return {
                success: false,
                error: errorMsg,
                channelId,
            };
        }
    }

    /**
     * Upload edilen videonun detaylarını getir
     */
    async getVideoDetails(
        channelId: string,
        videoId: string
    ): Promise<youtube_v3.Schema$Video | null> {
        try {
            const client = await this.authService.getAuthenticatedClient(channelId);
            const youtube = google.youtube({ version: 'v3', auth: client });

            const response = await youtube.videos.list({
                part: ['snippet', 'status', 'statistics'],
                id: [videoId],
            });

            return response.data.items?.[0] || null;
        } catch (error: any) {
            logger.error(`Video detay hatası: ${videoId} — ${error.message}`);
            return null;
        }
    }
}

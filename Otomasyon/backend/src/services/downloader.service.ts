import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { logger } from '../utils/logger';
import { scanVideosDirectory, ScanResult } from './scanner.service';
import { generateYouTubeMetadata } from './ai.service';

export interface DownloadRequest {
    url: string;
    title?: string;
    description?: string;
    tags?: string;
    targetFilename?: string;
}

export interface VideoMetadataFromUrl {
    title?: string;
    description: string;
    tags: string[];
    uploader: string;
    duration: number;
}

export interface DownloadResult {
    success: boolean;
    filename?: string;
    metadata?: VideoMetadataFromUrl;
    aiMetadata?: {
        title: string;
        description: string;
        tags: string[];
    };
    scanResult?: ScanResult;
    error?: string;
}

/**
 * yt-dlp ile URL'den metadata çek (video indirmeden)
 */
export function extractMetadata(url: string): Promise<VideoMetadataFromUrl> {
    return new Promise((resolve, reject) => {
        const isInstagram = url.includes('instagram.com');
        const cookiesPath = path.resolve(process.cwd(), 'cookies.txt');
        const cookiesArg = fs.existsSync(cookiesPath) && isInstagram ? ['--cookies', cookiesPath] : [];

        const args = [
            '--dump-json',
            '--no-download',
            '--no-warnings',
            ...cookiesArg,
            url,
        ];

        execFile('yt-dlp', args, { timeout: 30000 }, (error, stdout, stderr) => {
            if (error) {
                logger.error(`Metadata çekme hatası: ${error.message}`);
                reject(new Error(`Metadata alınamadı: ${error.message}`));
                return;
            }

            try {
                const info = JSON.parse(stdout);

                // Hashtag'leri description'dan çıkar
                const hashtagRegex = /#[\wığüşöçİĞÜŞÖÇ]+/g;
                const descriptionText = info.description || '';
                const hashtagsFromDesc = descriptionText.match(hashtagRegex) || [];
                const cleanTags = hashtagsFromDesc.map((t: string) => t.replace('#', ''));

                // yt-dlp'nin kendi tag'leri varsa onları da ekle
                const ytTags = info.tags || [];
                const allTags = [...new Set([...cleanTags, ...ytTags])];

                resolve({
                    description: descriptionText,
                    tags: allTags.slice(0, 20),
                    uploader: info.uploader || info.channel || '',
                    duration: info.duration || 0,
                });
            } catch (parseError: any) {
                reject(new Error(`JSON parse hatası: ${parseError.message}`));
            }
        });
    });
}

/**
 * Klasördeki mevcut mp4 dosyalarını listele
 */
function getExistingMp4Files(dir: string): Set<string> {
    try {
        return new Set(
            fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.mp4'))
        );
    } catch {
        return new Set();
    }
}

/**
 * yt-dlp ile videoyu indir + metadata dosyası oluştur + tarama yap
 */
export async function downloadVideo(req: DownloadRequest): Promise<DownloadResult> {
    const videosDir = path.resolve(config.videosDir);

    // videos/ klasörü yoksa oluştur
    if (!fs.existsSync(videosDir)) {
        fs.mkdirSync(videosDir, { recursive: true });
    }

    try {
        // 1. Önce metadata çek
        logger.info(`Metadata çekiliyor: ${req.url}`);
        let metadata: VideoMetadataFromUrl;
        try {
            metadata = await extractMetadata(req.url);
            logger.info(`Metadata alındı — ${metadata.tags.length} etiket`);
        } catch {
            metadata = {
                description: '',
                tags: [],
                uploader: '',
                duration: 0,
            };
            logger.warn('Metadata alınamadı, varsayılan değerler kullanılacak');
        }

        // 2. İndirmeden önce mevcut dosyaları kaydet
        const beforeFiles = getExistingMp4Files(videosDir);

        // 3. Videoyu indir
        logger.info(`Video indiriliyor: ${req.url}`);

        const isInstagram = req.url.includes('instagram.com');
        const formatArg = isInstagram 
            ? ['-f', 'b'] 
            : ['-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', '--merge-output-format', 'mp4'];
            
        const cookiesPath = path.resolve(process.cwd(), 'cookies.txt');
        const cookiesArg = fs.existsSync(cookiesPath) && isInstagram ? ['--cookies', cookiesPath] : [];

        const filenameToUse = req.targetFilename || '%(id)s.%(ext)s';
        const outputTemplate = path.join(videosDir, filenameToUse);

        await new Promise<void>((resolve, reject) => {
            const args = [
                ...formatArg,
                ...cookiesArg,
                '--remux-video', 'mp4',
                '-o', outputTemplate,
                '--no-playlist',
                '--no-warnings',
                '--no-simulate',
                req.url,
            ];

            execFile('yt-dlp', args, { timeout: 120000 }, (error, stdout, stderr) => {
                if (error) {
                    logger.error(`İndirme hatası: ${error.message}`);
                    if (stderr) logger.error(`stderr: ${stderr}`);
                    reject(new Error(`Video indirilemedi: ${error.message}`));
                    return;
                }
                logger.debug(`yt-dlp stdout: ${stdout}`);
                resolve();
            });
        });

        // 4. Yeni eklenen mp4 dosyasını bul
        const afterFiles = getExistingMp4Files(videosDir);
        let filename = req.targetFilename || '';
        if (!filename) {
            for (const f of afterFiles) {
                if (!beforeFiles.has(f)) {
                    filename = f;
                    break;
                }
            }

            if (!filename) {
                // Belki zaten vardı — en son değiştirilen mp4'ü al
                const mp4Files = Array.from(afterFiles);
                if (mp4Files.length > 0) {
                    const sorted = mp4Files
                        .map(f => ({ name: f, mtime: fs.statSync(path.join(videosDir, f)).mtimeMs }))
                        .sort((a, b) => b.mtime - a.mtime);
                    filename = sorted[0].name;
                }
            }
        }

        if (!filename) {
            throw new Error('İndirilen dosya bulunamadı');
        }

        logger.info(`Video indirildi: ${filename}`);

        // 5. Metadata oluştur (AI Optimizasyonu)
        const baseName = path.parse(filename).name;
        const txtPath = path.join(videosDir, `${baseName}.txt`);

        const rawDescription = req.description || metadata.description;
        const rawTags = req.tags ? req.tags.split(',').map(t => t.trim()) : metadata.tags;

        logger.info('AI metadata üretiliyor...');
        const aiMetadata = await generateYouTubeMetadata(rawDescription, rawTags);

        // Nihai değerleri txt dosyasına yaz
        const txtContent = [
            `title: ${aiMetadata.title || baseName}`,
            `description: ${aiMetadata.description || rawDescription}`,
            `tags: ${aiMetadata.tags.length > 0 ? aiMetadata.tags.join(', ') : rawTags.join(', ')}`,
        ].join('\n');

        fs.writeFileSync(txtPath, txtContent, 'utf-8');
        logger.info(`Metadata dosyası oluşturuldu: ${txtPath}`);

        // 6. Otomatik tarama yap
        const scanResult = scanVideosDirectory();
        logger.info(`Tarama tamamlandı: ${scanResult.added} video eklendi`);

        return {
            success: true,
            filename,
            metadata,
            aiMetadata,
            scanResult,
        };
    } catch (error: any) {
        logger.error(`Download hatası: ${error.message}`);
        return {
            success: false,
            error: error.message,
        };
    }
}

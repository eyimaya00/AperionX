import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { logger } from '../utils/logger';
import { scanVideosDirectory, ScanResult } from './scanner.service';
import { generateYouTubeMetadata, analyzeVideoWithGemini } from './ai.service';
import { instagramGetUrl } from 'instagram-url-direct';


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
        const localCookiesPath = path.resolve(process.cwd(), 'cookies.txt');
        const fallbackCookiesPath = path.resolve(__dirname, '../../cookies.txt');
        const cookiesPath = fs.existsSync(localCookiesPath) ? localCookiesPath : fallbackCookiesPath;
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


async function downloadFileFromUrl(url: string, destPath: string): Promise<void> {
    const http = url.startsWith('https') ? require('https') : require('http');
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        http.get(url, (response: any) => {
            // Follow redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
                const redirectUrl = response.headers.location;
                if (redirectUrl) {
                    file.close();
                    return downloadFileFromUrl(redirectUrl, destPath).then(resolve).catch(reject);
                }
            }
            if (response.statusCode !== 200) {
                file.close();
                fs.unlinkSync(destPath);
                reject(new Error(`HTTP error! status: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                const stats = fs.statSync(destPath);
                if (stats.size < 1000) {
                    fs.unlinkSync(destPath);
                    reject(new Error('İndirilen dosya çok küçük, muhtemelen geçersiz.'));
                    return;
                }
                resolve();
            });
        }).on('error', (err: any) => {
            file.close();
            if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
            reject(err);
        });
    });
}

/**
 * instagram-url-direct paketi ile Instagram videosunu indir (yt-dlp başarısız olduğunda fallback)
 */
async function downloadWithInstagramDirect(url: string, destPath: string): Promise<void> {
    logger.info(`instagram-url-direct ile indirme deneniyor: ${url}`);
    const result = await instagramGetUrl(url);

    if (!result || !result.url_list || result.url_list.length === 0) {
        throw new Error('instagram-url-direct: Video URL bulunamadı. Post özel veya erişilemez olabilir.');
    }

    const videoUrl = result.url_list[0];
    logger.info(`instagram-url-direct: Direkt video linki alındı. İndiriliyor...`);
    await downloadFileFromUrl(videoUrl, destPath);
    logger.info(`instagram-url-direct: İndirme tamamlandı -> ${path.basename(destPath)}`);
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
            
        const localCookiesPath = path.resolve(process.cwd(), 'cookies.txt');
        const fallbackCookiesPath = path.resolve(__dirname, '../../cookies.txt');
        const cookiesPath = fs.existsSync(localCookiesPath) ? localCookiesPath : fallbackCookiesPath;
        const cookiesArg = fs.existsSync(cookiesPath) && isInstagram ? ['--cookies', cookiesPath] : [];

        const filenameToUse = req.targetFilename || '%(id)s.%(ext)s';
        const outputTemplate = path.join(videosDir, filenameToUse);

        let filename = req.targetFilename || '';
        let downloadSuccess = false;
        let ytDlpError: any = null;

        try {
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
                        logger.error(`yt-dlp indirme hatası: ${error.message}`);
                        if (stderr) logger.error(`stderr: ${stderr}`);
                        reject(error);
                        return;
                    }
                    logger.debug(`yt-dlp stdout: ${stdout}`);
                    resolve();
                });
            });
            downloadSuccess = true;
        } catch (err: any) {
            ytDlpError = err;
            logger.warn(`yt-dlp indirme başarısız oldu: ${err.message}. Cobalt ile alternatif indirme deneniyor...`);
        }

        if (!downloadSuccess && isInstagram) {
            try {
                const finalFilename = req.targetFilename || `dl_${Date.now()}.mp4`;
                const finalPath = path.join(videosDir, finalFilename);
                await downloadWithInstagramDirect(req.url, finalPath);
                downloadSuccess = true;
                filename = finalFilename;
                logger.info(`✅ instagram-url-direct ile indirme başarılı: ${finalFilename}`);
            } catch (igErr: any) {
                logger.error(`❌ instagram-url-direct indirmesi de başarısız oldu: ${igErr.message}`);
                throw new Error(`Video indirilemedi. yt-dlp Hatası: ${ytDlpError?.message || 'Bilinmiyor'} | instagram-url-direct Hatası: ${igErr.message}`);
            }
        } else if (!downloadSuccess) {
            throw new Error(`Video indirilemedi: ${ytDlpError?.message || 'Bilinmeyen hata'}`);
        }

        // 4. Yeni eklenen mp4 dosyasını bul (Eğer yt-dlp başarılı olduysa ve filename yoksa)
        if (!filename) {
            const afterFiles = getExistingMp4Files(videosDir);
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

        let aiMetadata;
        const videoFilePath = path.join(videosDir, filename);

        // Eğer açıklama ve etiketler yoksa/boşsa, doğrudan Gemini ile videoyu izleyip sıfırdan metadata üretsin!
        if (!rawDescription && rawTags.length === 0) {
            logger.info('Kaynak açıklaması ve etiketleri boş (Instagram engeli nedeniyle çekilemedi). Gemini ile video doğrudan analiz ediliyor...');
            try {
                aiMetadata = await analyzeVideoWithGemini(videoFilePath);
            } catch (geminiErr: any) {
                logger.error(`Gemini video analiz hatası: ${geminiErr.message}. Fallback metadatalar kullanılacak.`);
                aiMetadata = {
                    title: baseName,
                    description: 'Otomatik analiz başarısız oldu.',
                    tags: ['shorts', 'automation']
                };
            }
        } else {
            logger.info('AI metadata üretiliyor...');
            aiMetadata = await generateYouTubeMetadata(rawDescription, rawTags);
        }

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

import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';
import { VideoModel, LogModel } from '../models';
import { parseMetadataFile } from './metadata-parser.service';
import { getNextScheduleSlot } from '../utils/date-utils';

export interface ScanResult {
    scanned: number;
    added: number;
    skipped: number;
    errors: number;
    details: ScanDetail[];
}

export interface ScanDetail {
    filename: string;
    status: 'added' | 'skipped' | 'error';
    message: string;
}

/**
 * videos/ klasöründeki mp4 dosyalarını tara,
 * eşleşen txt metadata'yı parse et, veritabanına kaydet
 */
export function scanVideosDirectory(): ScanResult {
    const videosDir = path.resolve(config.videosDir);
    const result: ScanResult = {
        scanned: 0,
        added: 0,
        skipped: 0,
        errors: 0,
        details: [],
    };

    // videos/ klasörü var mı?
    if (!fs.existsSync(videosDir)) {
        fs.mkdirSync(videosDir, { recursive: true });
        logger.info(`Videos dizini oluşturuldu: ${videosDir}`);
    }

    // mp4 dosyalarını bul
    let files: string[];
    try {
        files = fs.readdirSync(videosDir).filter(f =>
            f.toLowerCase().endsWith('.mp4')
        );
    } catch (error: any) {
        logger.error(`Videos dizini okunamadı: ${error.message}`);
        return result;
    }

    if (files.length === 0) {
        logger.info('Videos dizininde mp4 dosyası bulunamadı');
        return result;
    }

    logger.info(`${files.length} mp4 dosyası bulundu, tarama başlıyor...`);

    for (const filename of files) {
        result.scanned++;

        try {
            // ===== Duplicate kontrol =====
            const existing = VideoModel.findByFilename(filename);
            if (existing) {
                result.skipped++;
                result.details.push({
                    filename,
                    status: 'skipped',
                    message: 'Zaten kayıtlı (duplicate)',
                });
                logger.debug(`Atlandı (duplicate): ${filename}`);
                continue;
            }

            // ===== Metadata TXT dosyasını ara =====
            const baseName = path.parse(filename).name;
            const txtPath = path.join(videosDir, `${baseName}.txt`);
            const metadata = parseMetadataFile(txtPath);

            // ===== Veritabanına kaydet =====
            const video = VideoModel.create({
                filename,
                title: metadata?.title || baseName,
                description: metadata?.description || '',
                tags: metadata?.tags || [],
                scheduled_date: metadata?.date || getNextScheduleSlot(),
            });

            // Log oluştur
            const logParts = [`Video tarandı ve eklendi`];
            if (metadata) {
                logParts.push(`(metadata: ${txtPath})`);
            } else {
                logParts.push('(metadata dosyası bulunamadı, varsayılan değerler kullanıldı)');
            }
            LogModel.create(video.id, logParts.join(' '));

            result.added++;
            result.details.push({
                filename,
                status: 'added',
                message: metadata
                    ? `Eklendi — title: "${video.title}", tags: [${metadata.tags.join(', ')}]`
                    : 'Eklendi — metadata dosyası yok, dosya adı başlık olarak kullanıldı',
            });

            logger.info(`✅ Eklendi: ${filename} → ID: ${video.id}`);
        } catch (error: any) {
            result.errors++;
            result.details.push({
                filename,
                status: 'error',
                message: error.message,
            });
            logger.error(`❌ Hata: ${filename} — ${error.message}`);
        }
    }

    logger.info(
        `Tarama tamamlandı: ${result.scanned} tarandı, ${result.added} eklendi, ` +
        `${result.skipped} atlandı, ${result.errors} hata`
    );

    return result;
}

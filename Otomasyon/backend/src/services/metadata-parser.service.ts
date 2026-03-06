import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

/**
 * Metadata TXT dosyasını parse et
 *
 * Format:
 *   title: Video Başlığı
 *   description: Video açıklaması
 *   tags: tag1, tag2, tag3
 *   date: 2026-03-15
 */

export interface ParsedMetadata {
    title: string;
    description: string;
    tags: string[];
    date: string | null;
}

export function parseMetadataFile(filePath: string): ParsedMetadata | null {
    try {
        if (!fs.existsSync(filePath)) {
            logger.debug(`Metadata dosyası bulunamadı: ${filePath}`);
            return null;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split(/\r?\n/);

        const result: ParsedMetadata = {
            title: '',
            description: '',
            tags: [],
            date: null,
        };

        for (const line of lines) {
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) continue;

            const key = line.substring(0, colonIndex).trim().toLowerCase();
            const value = line.substring(colonIndex + 1).trim();

            switch (key) {
                case 'title':
                    result.title = value;
                    break;
                case 'description':
                    result.description = value;
                    break;
                case 'tags':
                    result.tags = value
                        .split(',')
                        .map(t => t.trim())
                        .filter(t => t.length > 0);
                    break;
                case 'date':
                    result.date = value || null;
                    break;
            }
        }

        logger.debug(`Metadata parse edildi: ${filePath}`, result);
        return result;
    } catch (error: any) {
        logger.error(`Metadata parse hatası: ${filePath} — ${error.message}`);
        return null;
    }
}

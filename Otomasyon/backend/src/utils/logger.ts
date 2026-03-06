import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

// Log dizinini oluştur
const logDir = path.resolve(config.logDir);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Özel format
const customFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase().padEnd(5)}] ${message}`;
        if (stack) log += `\n${stack}`;
        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
        }
        return log;
    })
);

// Konsol formatı (renkli)
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} ${level} ${message}`;
    })
);

export const logger = winston.createLogger({
    level: config.logLevel,
    format: customFormat,
    transports: [
        // Konsol çıktısı
        new winston.transports.Console({
            format: consoleFormat,
        }),

        // Tüm loglar
        new winston.transports.File({
            filename: path.join(logDir, 'app.log'),
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 5,
        }),

        // Sadece hatalar
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5,
        }),
    ],
});

// Production dışında debug bilgileri
if (config.env !== 'production') {
    logger.debug('Logger başlatıldı', { level: config.logLevel, logDir });
}

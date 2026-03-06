import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { logger } from './utils/logger';
import { initDatabase, runMigrations } from './database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';
import { startScheduler } from './services/scheduler.service';

/**
 * Express uygulamasını oluştur ve yapılandır
 */
function createApp(): express.Application {
    const app = express();

    // ===== Güvenlik & Temel Middleware =====
    app.use(helmet());
    app.use(cors({
        origin: [
            'http://localhost:3000',
            'http://localhost:3002',
            'https://shorts.aperionx.com',
            'https://www.aperionx.com',
            'https://aperionx.com',
            'https://shorts-api.aperionx.com',
        ],
        credentials: true,
    }));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // HTTP request loglama
    app.use(morgan('short', {
        stream: {
            write: (message: string) => logger.info(message.trim()),
        },
    }));

    // ===== API Routes =====
    app.use('/api', routes);

    // ===== Root endpoint =====
    app.get('/', (_req, res) => {
        res.json({
            name: 'YouTube Shorts Otomasyon API',
            version: '1.0.0',
            docs: '/api/health',
        });
    });

    // ===== Hata Yakalama =====
    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}

/**
 * Sunucuyu başlat
 */
async function start(): Promise<void> {
    try {
        // 1. Veritabanını başlat
        logger.info('Veritabanı başlatılıyor...');
        initDatabase();
        runMigrations();

        // 2. Express uygulamasını oluştur
        const app = createApp();

        // 3. Zamanlayıcıyı başlat
        startScheduler();

        // 3. Sunucuyu dinlemeye başla
        app.listen(config.port, config.host, () => {
            logger.info('========================================');
            logger.info(`🚀 Sunucu çalışıyor`);
            logger.info(`   URL: http://${config.host}:${config.port}`);
            logger.info(`   Ortam: ${config.env}`);
            logger.info(`   Veritabanı: ${config.databasePath}`);
            logger.info('========================================');
        });

        // Graceful shutdown
        const shutdown = () => {
            logger.info('Sunucu kapatılıyor...');
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    } catch (error) {
        logger.error('Sunucu başlatma hatası:', error);
        process.exit(1);
    }
}

// Başlat
start();

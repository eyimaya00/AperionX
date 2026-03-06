import dotenv from 'dotenv';
import path from 'path';

// .env dosyasını yükle
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
    // Server
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || 'localhost',

    // Database
    databasePath: process.env.DATABASE_PATH || './data/shorts.db',

    // Logging
    logLevel: process.env.LOG_LEVEL || 'debug',
    logDir: process.env.LOG_DIR || './logs',

    // JWT
    jwtSecret: process.env.JWT_SECRET || 'dev-secret',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

    // YouTube API
    youtube: {
        clientId: process.env.YOUTUBE_CLIENT_ID || '',
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
        redirectUri: process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3001/api/youtube/callback',
    },

    // AI
    ai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.AI_MODEL || 'gpt-4o-mini',
    },

    // File Paths
    videosDir: process.env.VIDEOS_DIR || './videos',
    processedDir: process.env.PROCESSED_DIR || './processed',
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '256', 10),

    // Google Drive API
    drive: {
        folderId: process.env.DRIVE_FOLDER_ID || '',
        serviceAccountPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json',
        enabled: process.env.ENABLE_DRIVE_SYNC === 'true',
    }
} as const;

export type Config = typeof config;

import { google } from 'googleapis';
import { OAuth2Client, Credentials } from 'google-auth-library';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getDatabase } from '../database';
import {
    YouTubeChannel,
    CreateChannelDTO,
    TokenInfo,
    AuthUrlResult,
    AuthCallbackResult,
} from './youtube.types';

// OAuth2 scope'ları
const SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl',
];

/**
 * YouTube OAuth2 Authentication Service
 *
 * Multi-channel destek ile OAuth2 token yönetimi:
 * - Auth URL oluşturma
 * - Token exchange (code → tokens)
 * - Token refresh (otomatik)
 * - Token expiry kontrol
 * - Kanal CRUD (SQLite)
 *
 * Kullanım:
 *   const authService = new YouTubeAuthService();
 *   const { url } = authService.generateAuthUrl();
 *   // kullanıcı URL'ye gider, Google yetkilendirir, callback gelir
 *   const result = await authService.handleCallback(code);
 *   // artık upload için authenticated client alınabilir
 *   const client = await authService.getAuthenticatedClient(channelId);
 */
export class YouTubeAuthService {
    private oauth2Client: OAuth2Client;

    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            config.youtube.clientId,
            config.youtube.clientSecret,
            config.youtube.redirectUri
        );
    }

    // ===================================================================
    //  OAuth2 Flow
    // ===================================================================

    /**
     * Google OAuth2 yetkilendirme URL'si oluştur
     */
    generateAuthUrl(state?: string): AuthUrlResult {
        const url = this.oauth2Client.generateAuthUrl({
            access_type: 'offline',      // refresh_token almak için
            prompt: 'consent',           // her seferinde consent ekranı
            scope: SCOPES,
            state: state || undefined,
        });

        logger.info('OAuth2 auth URL oluşturuldu');
        return { url, state };
    }

    /**
     * OAuth2 callback — code ile token al, kanal bilgisi çek, DB'ye kaydet
     */
    async handleCallback(code: string): Promise<AuthCallbackResult> {
        // 1. Code → Token exchange
        const { tokens } = await this.oauth2Client.getToken(code);
        this.oauth2Client.setCredentials(tokens);

        logger.info('OAuth2 token exchange başarılı');

        if (!tokens.refresh_token) {
            throw new Error(
                'Refresh token alınamadı. Google hesap izinlerini iptal edip tekrar deneyin: ' +
                'https://myaccount.google.com/permissions'
            );
        }

        // 2. Kanal bilgisini çek
        const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });
        const channelResponse = await youtube.channels.list({
            part: ['snippet'],
            mine: true,
        });

        const channelData = channelResponse.data.items?.[0];
        if (!channelData || !channelData.id) {
            throw new Error('YouTube kanalı bulunamadı. Hesabınızda aktif bir kanal olmalı.');
        }

        // 3. Kanal bilgisini DB'ye kaydet veya güncelle
        const channelDTO: CreateChannelDTO = {
            channel_id: channelData.id,
            channel_name: channelData.snippet?.title || 'İsimsiz Kanal',
            access_token: tokens.access_token!,
            refresh_token: tokens.refresh_token,
            token_expiry: new Date(tokens.expiry_date || Date.now() + 3600000).toISOString(),
        };

        const existing = this.findChannelById(channelData.id);

        if (existing) {
            this.updateChannelTokens(existing.id, channelDTO);
            logger.info(`Kanal token güncellendi: ${channelDTO.channel_name} (${channelData.id})`);
            return { channel: this.findChannelById(channelData.id)!, isNew: false };
        } else {
            const channel = this.createChannel(channelDTO);
            logger.info(`Yeni kanal eklendi: ${channelDTO.channel_name} (${channelData.id})`);
            return { channel, isNew: true };
        }
    }

    // ===================================================================
    //  Token Yönetimi
    // ===================================================================

    /**
     * Bir kanal için authenticated OAuth2Client döndür
     * Token süresi dolmuşsa otomatik refresh yapar
     */
    async getAuthenticatedClient(channelId: string): Promise<OAuth2Client> {
        const channel = this.findChannelById(channelId);
        if (!channel) {
            throw new Error(`Kanal bulunamadı: ${channelId}`);
        }

        if (!channel.is_active) {
            throw new Error(`Kanal devre dışı: ${channelId}`);
        }

        const client = new google.auth.OAuth2(
            config.youtube.clientId,
            config.youtube.clientSecret,
            config.youtube.redirectUri
        );

        client.setCredentials({
            access_token: channel.access_token,
            refresh_token: channel.refresh_token,
            expiry_date: new Date(channel.token_expiry).getTime(),
        });

        // Token süresi dolmuş mu kontrol et
        const tokenInfo = this.getTokenInfo(channel);
        if (tokenInfo.is_expired) {
            logger.info(`Token süresi dolmuş, yenileniyor: ${channelId}`);
            await this.refreshToken(channel, client);
        }

        return client;
    }

    /**
     * Token bilgisini kontrol et
     */
    getTokenInfo(channel: YouTubeChannel): TokenInfo {
        const expiryDate = new Date(channel.token_expiry).getTime();
        const now = Date.now();
        // 5 dakika tampon — süresi dolmadan önce yenile
        const isExpired = expiryDate - now < 5 * 60 * 1000;

        return {
            access_token: channel.access_token,
            refresh_token: channel.refresh_token,
            expiry_date: expiryDate,
            is_expired: isExpired,
        };
    }

    /**
     * Refresh token ile yeni access token al
     */
    private async refreshToken(channel: YouTubeChannel, client: OAuth2Client): Promise<void> {
        try {
            const { credentials } = await client.refreshAccessToken();

            this.updateChannelTokens(channel.id, {
                channel_id: channel.channel_id,
                channel_name: channel.channel_name,
                access_token: credentials.access_token!,
                refresh_token: credentials.refresh_token || channel.refresh_token,
                token_expiry: new Date(credentials.expiry_date || Date.now() + 3600000).toISOString(),
            });

            logger.info(`Token yenilendi: ${channel.channel_name} (${channel.channel_id})`);
        } catch (error: any) {
            logger.error(`Token yenileme hatası: ${channel.channel_id} — ${error.message}`);

            // Refresh token geçersizse kanalı devre dışı bırak
            if (error.message?.includes('invalid_grant')) {
                this.setChannelActive(channel.id, false);
                logger.warn(`Kanal devre dışı bırakıldı (invalid_grant): ${channel.channel_id}`);
            }

            throw new Error(`Token yenilenemedi: ${error.message}. Kanalı tekrar yetkilendirin.`);
        }
    }

    // ===================================================================
    //  Kanal CRUD (SQLite)
    // ===================================================================

    /** Tüm kanalları getir */
    getAllChannels(): YouTubeChannel[] {
        const db = getDatabase();
        return db.prepare('SELECT * FROM youtube_channels ORDER BY created_at DESC').all() as YouTubeChannel[];
    }

    /** Aktif kanalları getir */
    getActiveChannels(): YouTubeChannel[] {
        const db = getDatabase();
        return db.prepare('SELECT * FROM youtube_channels WHERE is_active = 1 ORDER BY channel_name').all() as YouTubeChannel[];
    }

    /** Channel ID ile bul */
    findChannelById(channelId: string): YouTubeChannel | undefined {
        const db = getDatabase();
        return db.prepare('SELECT * FROM youtube_channels WHERE channel_id = ?').get(channelId) as YouTubeChannel | undefined;
    }

    /** DB ID ile bul */
    findChannelByDbId(id: number): YouTubeChannel | undefined {
        const db = getDatabase();
        return db.prepare('SELECT * FROM youtube_channels WHERE id = ?').get(id) as YouTubeChannel | undefined;
    }

    /** Yeni kanal oluştur */
    private createChannel(dto: CreateChannelDTO): YouTubeChannel {
        const db = getDatabase();
        const result = db.prepare(`
      INSERT INTO youtube_channels (channel_id, channel_name, access_token, refresh_token, token_expiry)
      VALUES (?, ?, ?, ?, ?)
    `).run(dto.channel_id, dto.channel_name, dto.access_token, dto.refresh_token, dto.token_expiry);

        return this.findChannelByDbId(Number(result.lastInsertRowid))!;
    }

    /** Kanal tokenlarını güncelle */
    private updateChannelTokens(id: number, dto: CreateChannelDTO): void {
        const db = getDatabase();
        db.prepare(`
      UPDATE youtube_channels
      SET access_token = ?, refresh_token = ?, token_expiry = ?,
          channel_name = ?, is_active = 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(dto.access_token, dto.refresh_token, dto.token_expiry, dto.channel_name, id);
    }

    /** Kanalı aktif/pasif yap */
    setChannelActive(id: number, active: boolean): void {
        const db = getDatabase();
        db.prepare("UPDATE youtube_channels SET is_active = ?, updated_at = datetime('now') WHERE id = ?")
            .run(active ? 1 : 0, id);
    }

    /** Kanalı sil */
    deleteChannel(id: number): boolean {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM youtube_channels WHERE id = ?').run(id);
        return result.changes > 0;
    }
}

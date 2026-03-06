import { OAuth2Client, Credentials } from 'google-auth-library';

// ===== YouTube Channel / Token Types =====

/** Veritabanındaki kanal kaydı */
export interface YouTubeChannel {
    id: number;
    channel_id: string;
    channel_name: string;
    access_token: string;
    refresh_token: string;
    token_expiry: string;       // ISO 8601
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

/** Yeni kanal kaydetme DTO */
export interface CreateChannelDTO {
    channel_id: string;
    channel_name: string;
    access_token: string;
    refresh_token: string;
    token_expiry: string;
}

/** Token bilgisi */
export interface TokenInfo {
    access_token: string;
    refresh_token: string;
    expiry_date: number;        // Unix timestamp ms
    is_expired: boolean;
}

// ===== YouTube Upload Types =====

/** Upload için video metadata */
export interface YouTubeVideoMetadata {
    title: string;
    description: string;
    tags: string[];
    categoryId?: string;        // YouTube category (22 = People & Blogs)
    privacyStatus: 'public' | 'unlisted' | 'private';
    madeForKids?: boolean;
    shortsAutoLabel?: boolean;  // #Shorts otomatik eklensin mi
}

/** Upload sonucu */
export interface YouTubeUploadResult {
    success: boolean;
    videoId?: string;
    videoUrl?: string;
    error?: string;
    channelId?: string;
}

/** OAuth2 auth URL oluşturma sonucu */
export interface AuthUrlResult {
    url: string;
    state?: string;
}

/** OAuth2 callback sonrası channel bilgisi */
export interface AuthCallbackResult {
    channel: YouTubeChannel;
    isNew: boolean;
}

/** YouTube API quota bilgisi */
export interface QuotaInfo {
    dailyLimit: number;
    used: number;
    remaining: number;
}

/** Video durumu */
export type VideoStatus = 'pending' | 'processing' | 'uploaded' | 'failed' | 'cancelled';

/** Video kaydı */
export interface Video {
    id: number;
    filename: string;
    title: string;
    description: string;
    tags: string; // JSON array string
    scheduled_date: string | null;
    status: VideoStatus;
    youtube_video_id: string | null;
    created_at: string;
    updated_at: string;
}

/** Yeni video oluşturma */
export interface CreateVideoDTO {
    filename: string;
    title?: string;
    description?: string;
    tags?: string[];
    scheduled_date?: string;
}

/** Video güncelleme */
export interface UpdateVideoDTO {
    title?: string;
    description?: string;
    tags?: string[];
    scheduled_date?: string;
    status?: VideoStatus;
    youtube_video_id?: string;
}

/** Log seviyesi */
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/** Log kaydı */
export interface Log {
    id: number;
    video_id: number;
    message: string;
    level: LogLevel;
    created_at: string;
}

/** API yanıt formatı */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

/** Sayfalama */
export interface PaginationQuery {
    page?: number;
    limit?: number;
    status?: VideoStatus;
    search?: string;
}

export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

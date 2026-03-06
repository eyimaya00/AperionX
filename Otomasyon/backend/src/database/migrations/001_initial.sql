-- =============================================
-- YouTube Shorts Otomasyon - Veritabanı Şeması
-- =============================================

-- Videos tablosu: Tüm video bilgilerini saklar
CREATE TABLE IF NOT EXISTS videos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    filename        TEXT    NOT NULL,
    title           TEXT    DEFAULT '',
    description     TEXT    DEFAULT '',
    tags            TEXT    DEFAULT '[]',        -- JSON array olarak saklanır
    scheduled_date  TEXT    DEFAULT NULL,         -- ISO 8601 format
    status          TEXT    NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending', 'processing', 'uploaded', 'failed', 'cancelled')),
    youtube_video_id TEXT   DEFAULT NULL,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Logs tablosu: Video işlem logları
CREATE TABLE IF NOT EXISTS logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id        INTEGER NOT NULL,
    message         TEXT    NOT NULL,
    level           TEXT    NOT NULL DEFAULT 'info'
                    CHECK(level IN ('info', 'warn', 'error', 'debug')),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_scheduled_date ON videos(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_logs_video_id ON logs(video_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);

-- =============================================
-- YouTube Channels tablosu (multi-channel destek)
-- =============================================

CREATE TABLE IF NOT EXISTS youtube_channels (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id      TEXT    NOT NULL UNIQUE,
    channel_name    TEXT    NOT NULL DEFAULT '',
    access_token    TEXT    NOT NULL,
    refresh_token   TEXT    NOT NULL,
    token_expiry    TEXT    NOT NULL,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_youtube_channels_active ON youtube_channels(is_active);

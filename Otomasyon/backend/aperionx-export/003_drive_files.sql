-- =============================================
-- Google Drive Otomasyon - Veritabanı Şeması
-- =============================================

-- drive_files tablosu: İndirilen Drive dosyalarının kaydını tutar
CREATE TABLE IF NOT EXISTS drive_files (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id     TEXT    NOT NULL UNIQUE,
    filename    TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'downloaded'
                CHECK(status IN ('pending', 'downloading', 'downloaded', 'failed')),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_drive_files_file_id ON drive_files(file_id);
CREATE INDEX IF NOT EXISTS idx_drive_files_status ON drive_files(status);

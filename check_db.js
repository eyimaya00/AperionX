const sqlite3 = require('better-sqlite3');
const path = require('path');
const db = new sqlite3(path.resolve(__dirname, 'Otomasyon/backend/data/shorts.db'));

const videos = db.prepare('SELECT id, filename, title, scheduled_date FROM videos ORDER BY scheduled_date ASC').all();
console.log(JSON.stringify(videos, null, 2));

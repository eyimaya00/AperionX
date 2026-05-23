const sqlite3 = require('better-sqlite3');
const path = require('path');
const dbPath = '/home/aperionx/htdocs/www.aperionx.com/Otomasyon/backend/data/shorts.db';
const db = new sqlite3(dbPath);

const pendingVideos = db.prepare("SELECT id, scheduled_date FROM videos WHERE status = 'pending'").all();

for (const video of pendingVideos) {
    if (video.scheduled_date) {
        // Change the time part to 20:15:00.000Z in TRT terms (which is 17:15:00.000Z UTC)
        // Actually, let's just use string replacement if we want to be safe with TRT.
        // Assuming the current date is YYYY-MM-DD
        const datePart = video.scheduled_date.split('T')[0];
        const newDate = `${datePart}T17:15:00.000Z`;
        db.prepare("UPDATE videos SET scheduled_date = ? WHERE id = ?").run(newDate, video.id);
        console.log(`Updated video ${video.id} to ${newDate}`);
    }
}

console.log("Done.");

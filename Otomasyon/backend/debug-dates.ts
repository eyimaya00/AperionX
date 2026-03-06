import { getDatabase, initDatabase } from './src/database';
console.log("--- DEBUGGING DATES ---");
initDatabase();
const db = getDatabase();

const rows = db.prepare("SELECT id, title, scheduled_date, status, datetime('now') as db_now, datetime('now', 'localtime') as db_now_local FROM videos").all();

rows.forEach((r: any) => {
    console.log(`Video ID: ${r.id}`);
    console.log(`Title: ${r.title}`);
    console.log(`Status: ${r.status}`);
    console.log(`Scheduled: ${r.scheduled_date}`);
    console.log(`DB Now (UTC): ${r.db_now}`);
    console.log(`DB Now (Local): ${r.db_now_local}`);
    console.log(`Is Ready (scheduled <= UTC Now): ${r.scheduled_date <= r.db_now}`);
    console.log(`Is Ready (scheduled <= Local Now): ${r.scheduled_date <= r.db_now_local}`);
    console.log('-------------------------');
});

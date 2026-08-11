const pool = require('../config/db');

async function test() {
    const [users] = await pool.query("SELECT id, fullname, username, email, role, avatar_url, bio, job_title, linkedin_url, public_email, created_at, last_login FROM users WHERE fullname LIKE '%Yasin%' OR username LIKE '%yasin%' OR username LIKE '%yaso%'");
    console.log('=== ALL YASIN USERS IN DB ===');
    console.table(users);

    for (const u of users) {
        const [arts] = await pool.query('SELECT id, title, status FROM articles WHERE author_id = ?', [u.id]);
        const [exps] = await pool.query('SELECT id, title, status FROM experiments WHERE author_id = ?', [u.id]);
        console.log(`\nUser ID ${u.id} (${u.fullname} / @${u.username} / ${u.email}): ${arts.length} Articles, ${exps.length} Experiments`);
        arts.forEach(a => console.log(`   [Article ${a.id}] ${a.title} (${a.status})`));
        exps.forEach(e => console.log(`   [Experiment ${e.id}] ${e.title} (${e.status})`));
    }

    process.exit(0);
}

test();

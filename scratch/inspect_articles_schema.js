const pool = require('../config/db');

async function test() {
    const [artCols] = await pool.query('SHOW COLUMNS FROM articles');
    console.log('--- ARTICLES COLUMNS ---');
    console.log(artCols.map(c => c.Field));

    const [expCols] = await pool.query('SHOW COLUMNS FROM experiments');
    console.log('--- EXPERIMENTS COLUMNS ---');
    console.log(expCols.map(c => c.Field));

    const [users] = await pool.query('SELECT id, fullname, username FROM users');
    console.log('\n--- USERS & THEIR ARTICLES/EXPERIMENTS ---');
    for (const u of users) {
        const [arts] = await pool.query(`
            SELECT a.id, a.title, a.author_id
            FROM articles a
            LEFT JOIN article_authors aa ON a.id = aa.article_id
            WHERE (a.author_id = ? OR aa.user_id = ?) AND a.status = 'published'
        `, [u.id, u.id]);

        const [exps] = await pool.query(`
            SELECT e.id, e.title, e.author_id
            FROM experiments e
            LEFT JOIN experiment_authors ea ON e.id = ea.experiment_id
            WHERE (e.author_id = ? OR ea.user_id = ?) AND e.status = 'published' AND e.deleted_at IS NULL
        `, [u.id, u.id]);

        if (arts.length > 0 || exps.length > 0 || u.fullname.includes('Sude') || u.fullname.includes('Aslan')) {
            console.log(`User ID: ${u.id} | Name: "${u.fullname}" | Username: "${u.username}" -> Articles: ${arts.length}, Experiments: ${exps.length}`);
            arts.forEach(a => console.log(`   [Article ${a.id}] ${a.title} (author_id: ${a.author_id})`));
            exps.forEach(e => console.log(`   [Experiment ${e.id}] ${e.title} (author_id: ${e.author_id})`));
        }
    }
    process.exit(0);
}

test();

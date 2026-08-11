const pool = require('../config/db');
const slugify = text => (text || '').toString().toLowerCase().replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');

async function test() {
    const key = 'yasin-eyimaya';
    const [allUsers] = await pool.query('SELECT id, fullname, username, email, bio, job_title, avatar_url, linkedin_url, public_email, show_email, created_at FROM users');
    const targetSlug = slugify(key);

    const matchingUsers = allUsers.filter(u => {
        if (/^\d+$/.test(key) && u.id === parseInt(key)) return true;
        if (u.username && u.username.toLowerCase() === key.toLowerCase()) return true;
        const fSlug = slugify(u.fullname);
        const uSlug = slugify(u.username);
        return (fSlug && fSlug === targetSlug) || (uSlug && uSlug === targetSlug);
    });

    console.log('=== MATCHING USERS FOR yasin-eyimaya ===');
    console.log(matchingUsers);

    process.exit(0);
}

test();

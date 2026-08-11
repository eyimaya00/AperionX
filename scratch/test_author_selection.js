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

    const isCustomAvatar = (url) => url && url.trim() !== '' && !url.includes('ui-avatars.com');
    const hasContent = (val) => val && val.trim() !== '';

    matchingUsers.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        if (isCustomAvatar(a.avatar_url)) scoreA += 10;
        if (isCustomAvatar(b.avatar_url)) scoreB += 10;

        if (hasContent(a.bio)) scoreA += 5;
        if (hasContent(b.bio)) scoreB += 5;

        if (hasContent(a.linkedin_url)) scoreA += 5;
        if (hasContent(b.linkedin_url)) scoreB += 5;

        if (hasContent(a.public_email)) scoreA += 5;
        if (hasContent(b.public_email)) scoreB += 5;

        if (hasContent(a.job_title)) scoreA += 3;
        if (hasContent(b.job_title)) scoreB += 3;

        if (scoreA !== scoreB) return scoreB - scoreA;
        return b.id - a.id;
    });

    let user = { ...matchingUsers[0] };
    console.log('=== SELECTED PRIMARY USER ===');
    console.log(user);

    process.exit(0);
}

test();

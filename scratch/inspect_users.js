const pool = require('../config/db');
const path = require('path');

function slugify(text) {
    if (!text) return '';
    const trMap = {
        'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ş': 's', 'Ş': 's',
        'ü': 'u', 'Ü': 'u', 'ı': 'i', 'İ': 'i', 'ö': 'o', 'Ö': 'o'
    };
    return text.toString()
        .split('')
        .map(c => trMap[c] || c)
        .join('')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

async function test() {
    const [users] = await pool.query('SELECT id, fullname, username FROM users');
    console.log('Users in DB:', users.length);
    users.forEach(u => {
        console.log(`ID: ${u.id} | Name: "${u.fullname}" -> Slug: "${slugify(u.fullname)}" | User: "${u.username}" -> Slug: "${slugify(u.username)}"`);
    });
    process.exit(0);
}

test();

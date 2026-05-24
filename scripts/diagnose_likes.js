const axios = require('axios');
const jwt = require('jsonwebtoken');

const secret = 'gizli_anahtar';
// Create a token for a user (ID 2 assumed author)
const token = jwt.sign({ id: 30, email: 'zengin@example.com', role: 'author' }, secret, { expiresIn: '1h' });

async function check() {
    console.log('--- DIAGNOSTIC START ---');
    try {
        console.log('1. Testing /api/author/likes...');
        const res = await axios.get('http://localhost/api/author/likes', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('RESULT: SUCCESS (200 OK)');
        console.log('Data Length:', res.data.length);
    } catch (e) {
        if (e.response) {
            console.log(`RESULT: FAILED (${e.response.status})`);
            console.log('Message:', e.response.data);
        } else {
            console.error('RESULT: CONNECTION ERROR', e.message);
        }
    }
    console.log('--- DIAGNOSTIC END ---');
}

check();

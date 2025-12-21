const http = require('http');
const jwt = require('jsonwebtoken');

// 1. Setup Admin Token (Matches server.js secret)
const secret = process.env.JWT_SECRET || 'gizli_anahtar';
const token = jwt.sign({ id: 999, email: 'debug@admin.com', role: 'admin' }, secret); // ID 999 to avoid conflict

// 2. Prepare Payload (Multipart simulation for Multer)
const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
const body =
    `--${boundary}\r\nContent-Disposition: form-data; name="site_title"\r\n\r\nDebug Title\r\n--${boundary}--\r\n`;

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/settings',
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(body)
    }
};

console.log('--- DIAGNOSING SETTINGS API ---');
console.log('Target: http://localhost:3000/api/settings');

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('BODY:', data);
        if (res.statusCode === 500) {
            console.log('\n!!! CRITICAL SERVER ERROR FOUND !!!');
            console.log('Please copy the BODY above and show it to the developer.');
        } else if (res.statusCode === 200) {
            console.log('\nSUCCESS: API is working correctly via script. Issue might be browser/frontend related.');
        } else {
            console.log('\nUnexpected Status.');
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(body);
req.end();

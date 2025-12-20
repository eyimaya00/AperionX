const http = require('http');

// Helper to login and get token
function login(email, password) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ identifier: email, password: password });
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const json = JSON.parse(body);
                    resolve(json.token);
                } else {
                    reject(`Login failed: ${res.statusCode} ${body}`);
                }
            });
        });
        req.write(data);
        req.end();
    });
}

// POST with FormData simulation (using boundary)
function postSettings(token) {
    return new Promise((resolve, reject) => {
        const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

        // Construct multipart body manually
        let body = '';

        // Text field: site_title
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="site_title"\r\n\r\n`;
        body += `AperionX Updated\r\n`;

        // Text field: site_description
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="site_description"\r\n\r\n`;
        body += `Testing Description Update\r\n`;

        body += `--${boundary}--\r\n`;

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/settings_v2',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = http.request(options, (res) => {
            let resBody = '';
            res.on('data', chunk => resBody += chunk);
            res.on('end', () => {
                console.log(`POST /api/settings - Status: ${res.statusCode}`);
                console.log('Body:', resBody);
                resolve();
            });
        });

        req.on('error', (e) => reject(e));
        req.write(body);
        req.end();
    });
}

async function run() {
    try {
        console.log('Logging in as admin...');
        const token = await login('admin@aperion.com', '123admin');
        console.log('Login successful. Token acquired.');

        console.log('Sending POST /api/settings...');
        await postSettings(token);

    } catch (e) {
        console.error('Error:', e);
    }
}

run();

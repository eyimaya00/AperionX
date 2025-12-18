const http = require('http');

// Helper to create a multipart request body without external libs
function createMultipartBody(fields, boundary) {
    let body = Buffer.alloc(0);
    const nl = '\r\n';

    for (const [key, value] of Object.entries(fields)) {
        body = Buffer.concat([
            body,
            Buffer.from(`--${boundary}${nl}`),
            Buffer.from(`Content-Disposition: form-data; name="${key}"${nl}`),
            Buffer.from(`${nl}`),
            Buffer.from(`${value}${nl}`)
        ]);
    }
    body = Buffer.concat([body, Buffer.from(`--${boundary}--${nl}`)]);
    return body;
}

// 1. First login to get token
const loginData = JSON.stringify({ email: 'admin@aperion.com', password: '123456' });
const loginOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
    }
};

const loginReq = http.request(loginOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        const json = JSON.parse(data);
        if (!json.token) {
            console.error('Login failed:', json);
            return;
        }
        console.log('Login successful');
        postSettings(json.token);
    });
});

loginReq.write(loginData);
loginReq.end();

function postSettings(token) {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const fields = {
        'site_title': 'AperionX Dependency Free',
        'contact_email': 'test@debug.com'
    };

    const body = createMultipartBody(fields, boundary);

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/settings',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('Settings POST response status:', res.statusCode);
            console.log('Settings POST response body:', data);
        });
    });

    req.write(body);
    req.end();
}

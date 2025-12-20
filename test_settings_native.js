const http = require('http');

function makeRequest(method, path, data, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/settings',
            method: method,
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': `Bearer ${token}` 
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                console.log(`${method} ${path} - Status: ${res.statusCode}`);
                console.log('Body:', body);
                resolve({ status: res.statusCode, body });
            });
        });

        req.on('error', (e) => {
            console.error(`Problem with request: ${e.message}`);
            reject(e);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function test() {
    console.log('--- Testing /api/settings ---');

    // 1. GET (should work without auth? No, authentication logic might vary, let's try)
    // Server code says: app.get('/api/settings', ...) NO auth middleware on GET in my fix?
    // Wait, let me check my fix code.
    // app.get('/api/settings', async (req, res) => { ... }) -> No authenticateToken middleware.

    await makeRequest('GET', '/api/settings');

    // 2. POST (Needs Auth)
    // We need a valid token. Hard to get one without login.
    // For now, let's just see if GET works. If GET works, the route exists.
}

test();

const http = require('http');

const endpoints = [
    { path: '/api/settings', name: 'Settings API' },
    { path: '/api/articles', name: 'Articles API' },
    { path: '/api/categories', name: 'Categories API' } // Assuming this exists
];

console.log('--- API HEALTH CHECK ROUTINE ---');

function checkEndpoint(endpoint) {
    return new Promise((resolve) => {
        http.get({
            hostname: 'localhost',
            port: 3000,
            path: endpoint.path,
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                console.log(`[${endpoint.name}] Status: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    console.log(`   ✔ OK (Data length: ${data.length})`);
                    // Preview data
                    const preview = data.substring(0, 100);
                    console.log(`   Preview: ${preview}...`);
                } else {
                    console.log(`   ❌ FAILED. Body: ${data}`);
                }
                resolve();
            });
        }).on('error', (e) => {
            console.log(`[${endpoint.name}] ❌ CONNECTION REFUSED: ${e.message}`);
            resolve();
        });
    });
}

async function run() {
    for (const ep of endpoints) {
        await checkEndpoint(ep);
    }
    console.log('--- CHECK COMPLETE ---');
}

run();

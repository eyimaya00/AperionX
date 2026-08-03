const https = require('https');

const url = 'https://www.aperionx.com/uploads/image-1782754981659-984419155.png';

const options = {
    method: 'HEAD',
    headers: {
        'User-Agent': 'WhatsApp/2.21.12.21 A'
    }
};

const req = https.request(url, options, (res) => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);
});

req.on('error', (e) => {
    console.error('Error:', e);
});

req.end();

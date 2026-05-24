const mysql = require('mysql2/promise');
const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function run() {
    console.log('--- DIAGNOSIS STARTING ---');

    // 1. DB CHECK
    console.log('\n1. CHECKING DATABASE CONNECTION & TABLE...');
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'aperionx_db'
        });
        console.log('✔ Database Connected');

        // Check Table
        try {
            await connection.query('SELECT 1 FROM settings LIMIT 1');
            console.log('✔ Table "settings" exists and is accessible.');
        } catch (e) {
            console.error('❌ Table "settings" ERROR:', e.message);
            if (e.code === 'ER_NO_SUCH_TABLE') {
                console.log('   Attempting to create table "settings" manually...');
                await connection.query(`
                    CREATE TABLE IF NOT EXISTS settings (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        setting_key VARCHAR(255) UNIQUE NOT NULL,
                        setting_value TEXT
                    )
                `);
                console.log('   ✔ Table "settings" created successfully.');
            }
        }
        await connection.end();
    } catch (e) {
        console.error('❌ Database Connection Failed:', e.message);
    }

    // 2. API CHECK
    console.log('\n2. CHECKING API (POST /api/settings)...');
    const secret = process.env.JWT_SECRET || 'gizli_anahtar';
    const token = jwt.sign({ id: 999, email: 'debug@admin.com', role: 'admin' }, secret);

    // Multipart payload
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="site_title"\r\n\r\nDebug Title\r\n--${boundary}--\r\n`;

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

    const req = http.request(options, (res) => {
        console.log(`\nHTTP STATUS: ${res.statusCode}`);
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            console.log('RESPONSE BODY:', data);
            console.log('\n--- DIAGNOSIS COMPLETE ---');
        });
    });

    req.on('error', e => console.error('API Request Failed:', e.message));
    req.write(body);
    req.end();
}

run();

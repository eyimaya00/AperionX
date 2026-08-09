const { spawn } = require('child_process');

console.log('Starting node server.js check...');
const srv = spawn('node', ['server.js'], { cwd: process.cwd() });

let isStarted = false;

srv.stdout.on('data', async (d) => {
    const msg = d.toString();
    console.log('[STDOUT]', msg);
    if ((msg.includes('çalışıyor') || msg.includes('listening') || msg.includes('3000')) && !isStarted) {
        isStarted = true;
        try {
            const res = await fetch('http://localhost:3000/');
            console.log('GET / Status:', res.status);
            const res2 = await fetch('http://localhost:3000/yazar/beyza-satioglu');
            console.log('GET /yazar/beyza-satioglu Status:', res2.status);
            const res3 = await fetch('http://localhost:3000/api/public/author/beyza-satioglu');
            console.log('GET /api/public/author/beyza-satioglu Status:', res3.status);
            const json3 = await res3.json();
            console.log('Author found:', json3.profile ? json3.profile.fullname : json3);
        } catch (e) {
            console.error('Fetch error:', e);
        } finally {
            srv.kill();
            process.exit(0);
        }
    }
});

srv.stderr.on('data', (d) => console.error('[STDERR]', d.toString()));

setTimeout(() => {
    console.log('Timeout waiting for server start.');
    srv.kill();
    process.exit(1);
}, 12000);

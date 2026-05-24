const { exec } = require('child_process');

console.log('--- KILLING OLD SERVER ---');

if (process.platform === 'win32') {
    console.log('⚠ Windows detected. Please restart manually or use Task Manager.');
} else {
    // Linux/Mac: Force kill port 3000
    // using fuser -k 3000/tcp is robust
    exec('fuser -k 3000/tcp', (err, stdout, stderr) => {
        // fuser returns exit code 1 if no process found (which is fine)
        console.log('✔ Port 3000 cleared (if it was open).');
        console.log('ready to start again...');
    });
}

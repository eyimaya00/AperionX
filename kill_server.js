const { exec } = require('child_process');

console.log('--- KILLING PORT 3000 PROCESSES ---');

const cmd = process.platform === 'win32'
    ? 'netstat -ano | findstr :3000'
    : 'lsof -t -i :3000';

exec(cmd, (err, stdout, stderr) => {
    if (err || !stdout) {
        console.log('No process found running on port 3000. Server is already stopped.');
        return;
    }

    const pids = stdout.trim().split(/\s+/).filter(p => p);
    if (pids.length === 0) return;

    // For Linux/Mac (lsof returns PIDs directly)
    if (process.platform !== 'win32') {
        pids.forEach(pid => {
            console.log(`Killing PID: ${pid}`);
            exec(`kill -9 ${pid}`);
        });
        console.log('✔ Old server processes killed.');
    } else {
        // Windows logic (parse netstat) - simplified for now as user is on Linux
        console.log('Manual check required on Windows if this fails.');
    }
});

const { exec } = require('child_process');

exec('netstat -ano | findstr :3000', (err, stdout, stderr) => {
    if (stdout) {
        const lines = stdout.trim().split('\n');
        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && !isNaN(pid)) {
                console.log(`Killing PID: ${pid}`);
                exec(`taskkill /PID ${pid} /F`, (e, out, err) => {
                    if (e) console.log(e);
                    else console.log(out);
                });
            }
        });
    } else {
        console.log("No process found on port 3000");
    }
});

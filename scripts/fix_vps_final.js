const fs = require('fs');
const path = require('path');

const baseDir = '/home/aperionx/htdocs/www.aperionx.com/Otomasyon/backend';

const filesToFix = [
    { path: 'src/utils/date-utils.ts', find: '20, 30, 0, 0', replace: '20, 15, 0, 0' },
    { path: 'dist/utils/date-utils.js', find: '20, 30, 0, 0', replace: '20, 15, 0, 0' },
    { path: 'src/services/scheduler.service.ts', find: "cron.schedule('0 */4 * * *'", replace: "cron.schedule('0 * * * *'" },
    { path: 'dist/services/scheduler.service.js', find: "cron.schedule('0 */4 * * *'", replace: "cron.schedule('0 * * * *'" }
];

for (const { path: filePath, find, replace } of filesToFix) {
    const fullPath = path.join(baseDir, filePath);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes(find)) {
            content = content.split(find).join(replace);
            fs.writeFileSync(fullPath, content, 'utf8');
            console.log(`Updated: ${filePath}`);
        } else {
            console.log(`Not found in: ${filePath}`);
        }
    } else {
        console.log(`File not found: ${filePath}`);
    }
}

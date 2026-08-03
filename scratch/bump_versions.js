const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, '..', 'views');

function bumpFiles() {
    try {
        const files = fs.readdirSync(viewsDir);
        files.forEach(file => {
            if (path.extname(file) === '.html') {
                const filePath = path.join(viewsDir, file);
                let content = fs.readFileSync(filePath, 'utf8');
                
                let updated = false;
                
                // Replace js version
                const updatedJsContent = content.replace(/script_v105\.js\?v=\d+/g, () => {
                    updated = true;
                    return 'script_v105.js?v=280';
                });
                
                // Replace css version
                const updatedCssContent = updatedJsContent.replace(/style\.css\?v=\d+/g, () => {
                    updated = true;
                    return 'style.css?v=280';
                });

                // Replace categories css version
                const updatedCategoriesContent = updatedCssContent.replace(/categories\.css\?v=\d+/g, () => {
                    updated = true;
                    return 'categories.css?v=267';
                });
                
                if (updated) {
                    fs.writeFileSync(filePath, updatedCategoriesContent, 'utf8');
                    console.log(`Bumped version in: ${file}`);
                }
            }
        });
    } catch (e) {
        console.error(e);
    }
}

bumpFiles();

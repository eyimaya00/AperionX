const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const SIZE_LIMIT_KB = 300;

function getAllImageFiles(dir, filesList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            getAllImageFiles(filePath, filesList);
        } else {
            const ext = path.extname(file).toLowerCase();
            if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
                filesList.push({
                    path: filePath,
                    size: stat.size,
                    ext: ext
                });
            }
        }
    }
    return filesList;
}

async function optimizeImage(file) {
    const filePath = file.path;
    const tempPath = filePath + '.tmp';
    
    try {
        const metadata = await sharp(filePath).metadata();
        let image = sharp(filePath).rotate();
        
        // Resize if width is larger than 1200
        if (metadata.width > 1200) {
            image = image.resize({ width: 1200, withoutEnlargement: true });
        }
        
        if (file.ext === '.png') {
            image = image.png({ quality: 70, compressionLevel: 9, palette: true });
        } else if (['.jpg', '.jpeg'].includes(file.ext)) {
            image = image.jpeg({ quality: 75, progressive: true });
        } else if (file.ext === '.webp') {
            image = image.webp({ quality: 75 });
        }
        
        await image.toFile(tempPath);
        fs.renameSync(tempPath, filePath);
        
        const newSize = fs.statSync(filePath).size;
        console.log(`Optimized: ${path.relative(UPLOADS_DIR, filePath)}`);
        console.log(`  Before: ${(file.size / 1024).toFixed(2)} KB`);
        console.log(`  After:  ${(newSize / 1024).toFixed(2)} KB`);
    } catch (err) {
        console.error(`Failed to optimize ${filePath}:`, err.message);
        if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
    }
}

async function main() {
    console.log('Scanning uploads directory...');
    const allImages = getAllImageFiles(UPLOADS_DIR);
    console.log(`Found ${allImages.length} images total.`);
    
    const largeImages = allImages.filter(img => img.size > SIZE_LIMIT_KB * 1024);
    console.log(`Found ${largeImages.length} images larger than ${SIZE_LIMIT_KB} KB.`);
    
    for (const img of largeImages) {
        console.log(`Processing: ${path.relative(UPLOADS_DIR, img.path)} (${(img.size / 1024).toFixed(2)} KB)`);
        await optimizeImage(img);
    }
    
    console.log('All done!');
}

main();

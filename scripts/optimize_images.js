const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const UPLOADS_DIR = path.join(__dirname, '../uploads');
const ARTICLE_IMAGES_DIR = path.join(UPLOADS_DIR, 'article_images');

async function processDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        
        // Skip directories and non-images
        if (fs.statSync(filePath).isDirectory()) continue;
        if (!file.match(/\.(jpg|jpeg|png|webp)$/i)) continue;
        
        try {
            const stats = fs.statSync(filePath);
            const sizeMB = stats.size / (1024 * 1024);
            
            // Only optimize if larger than ~100KB to save processing, or just process all.
            // Since they are large, we'll process anything over 300KB
            if (sizeMB > 0.3) {
                console.log(`Optimizing: ${file} (${sizeMB.toFixed(2)} MB)`);
                
                const tempPath = filePath + '.tmp';
                
                // Get image info
                const metadata = await sharp(filePath).metadata();
                
                let image = sharp(filePath);
                
                // Resize if too large (e.g., > 1600px width)
                if (metadata.width > 1600) {
                    image = image.resize({ width: 1600, withoutEnlargement: true });
                }
                
                // Optimize based on format
                if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
                    image = image.jpeg({ quality: 80 });
                } else if (metadata.format === 'png') {
                    image = image.png({ quality: 80, compressionLevel: 8 });
                } else if (metadata.format === 'webp') {
                    image = image.webp({ quality: 80 });
                }
                
                await image.toFile(tempPath);
                
                // Replace original
                fs.renameSync(tempPath, filePath);
                
                const newStats = fs.statSync(filePath);
                const newSizeMB = newStats.size / (1024 * 1024);
                console.log(`  -> Reduced to ${newSizeMB.toFixed(2)} MB`);
            }
        } catch (error) {
            console.error(`Error processing ${file}:`, error);
        }
    }
}

async function run() {
    console.log("Starting image optimization...");
    await processDirectory(UPLOADS_DIR);
    await processDirectory(ARTICLE_IMAGES_DIR);
    console.log("Optimization complete.");
}

run();

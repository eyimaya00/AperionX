const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '../uploads');

// Find the best logo file in uploads directory
let logoPath = path.join(uploadsDir, 'logo.png');
if (!fs.existsSync(logoPath)) {
    const files = fs.readdirSync(uploadsDir);
    const logoFiles = files.filter(f => f.startsWith('site_logo-') && f.endsWith('.png'));
    if (logoFiles.length > 0) {
        logoFiles.sort().reverse();
        logoPath = path.join(uploadsDir, logoFiles[0]);
    } else {
        logoPath = path.join(uploadsDir, 'favicon.png');
    }
}

console.log("Using logo file:", logoPath);

async function stampPdf(pdfPath) {
    try {
        const pdfBytes = fs.readFileSync(pdfPath);
        const logoBytes = fs.readFileSync(logoPath);

        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        let logoImage;
        if (logoPath.toLowerCase().endsWith('.png')) {
            logoImage = await pdfDoc.embedPng(logoBytes);
        } else if (logoPath.toLowerCase().endsWith('.jpg') || logoPath.toLowerCase().endsWith('.jpeg')) {
            logoImage = await pdfDoc.embedJpg(logoBytes);
        } else {
            throw new Error('Unsupported image format');
        }

        const pages = pdfDoc.getPages();
        for (const page of pages) {
            const { width, height } = page.getSize();
            
            // Draw Logo on Top Right
            // Target logo height: 35 units
            const scale = 35 / logoImage.height;
            const logoWidth = logoImage.width * scale;
            const logoHeight = 35;
            
            page.drawImage(logoImage, {
                x: width - logoWidth - 25,
                y: height - logoHeight - 15,
                width: logoWidth,
                height: logoHeight,
            });

            // Draw "www.aperionx.com" on Bottom Center
            const font = await pdfDoc.embedFont('Helvetica');
            const text = 'www.aperionx.com';
            const fontSize = 9;
            const textWidth = font.widthOfTextAtSize(text, fontSize);
            
            page.drawText(text, {
                x: (width - textWidth) / 2,
                y: 15,
                size: fontSize,
                font: font,
                color: rgb(0.4, 0.4, 0.4),
            });
        }

        const modifiedPdfBytes = await pdfDoc.save();
        fs.writeFileSync(pdfPath, modifiedPdfBytes);
        console.log(`[SUCCESS] Stamped: ${path.basename(pdfPath)}`);
        return true;
    } catch (e) {
        console.error(`[ERROR] Stamped failed for ${path.basename(pdfPath)}:`, e.message);
        return false;
    }
}

async function run() {
    try {
        if (!fs.existsSync(logoPath)) {
            console.error("Logo file not found in uploads directory. Please ensure logo.png exists.");
            process.exit(1);
        }

        const files = fs.readdirSync(uploadsDir);
        const pdfFiles = files.filter(f => f.startsWith('pdf-') && f.endsWith('.pdf'));
        
        console.log(`Found ${pdfFiles.length} PDF files to stamp.`);
        
        let successCount = 0;
        for (const file of pdfFiles) {
            const pdfPath = path.join(uploadsDir, file);
            const success = await stampPdf(pdfPath);
            if (success) successCount++;
        }
        
        console.log(`Completed. Stamped ${successCount}/${pdfFiles.length} PDFs.`);
        process.exit(0);
    } catch (e) {
        console.error("Runner failed:", e);
        process.exit(1);
    }
}

run();

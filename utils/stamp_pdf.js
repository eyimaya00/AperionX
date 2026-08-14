const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

function getLogoPath(baseDir) {
    const uploadsDir = path.join(baseDir || path.join(__dirname, '..'), 'uploads');
    let logoPath = path.join(uploadsDir, 'logo.png');
    if (fs.existsSync(logoPath)) return logoPath;

    if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        const logoFiles = files.filter(f => f.startsWith('site_logo-') && (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')));
        if (logoFiles.length > 0) {
            logoFiles.sort().reverse();
            return path.join(uploadsDir, logoFiles[0]);
        }
    }

    const publicLogo = path.join(baseDir || path.join(__dirname, '..'), 'public', 'uploads', 'logo.png');
    if (fs.existsSync(publicLogo)) return publicLogo;

    return logoPath;
}

/**
 * Stamps a PDF file with top-right logo and bottom-center footer text
 * @param {string} pdfPath - Absolute path to the target PDF file
 * @returns {Promise<boolean>}
 */
async function stampPdfFile(pdfPath) {
    try {
        if (!fs.existsSync(pdfPath)) {
            console.error(`[stampPdfFile] Target PDF does not exist: ${pdfPath}`);
            return false;
        }

        const logoPath = getLogoPath();
        if (!fs.existsSync(logoPath)) {
            console.error(`[stampPdfFile] Logo file not found at: ${logoPath}`);
            return false;
        }

        const pdfBytes = fs.readFileSync(pdfPath);
        const logoBytes = fs.readFileSync(logoPath);

        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        let logoImage;
        const lowerLogoPath = logoPath.toLowerCase();
        if (lowerLogoPath.endsWith('.png')) {
            logoImage = await pdfDoc.embedPng(logoBytes);
        } else if (lowerLogoPath.endsWith('.jpg') || lowerLogoPath.endsWith('.jpeg')) {
            logoImage = await pdfDoc.embedJpg(logoBytes);
        } else {
            console.error(`[stampPdfFile] Unsupported logo image format: ${logoPath}`);
            return false;
        }

        const font = await pdfDoc.embedFont('Helvetica');
        const text = 'www.aperionx.com';
        const fontSize = 9;
        const textWidth = font.widthOfTextAtSize(text, fontSize);

        const pages = pdfDoc.getPages();
        for (const page of pages) {
            const { width, height } = page.getSize();
            
            // Top Right Logo (Height = 35)
            const scale = 35 / logoImage.height;
            const logoWidth = logoImage.width * scale;
            const logoHeight = 35;
            
            page.drawImage(logoImage, {
                x: width - logoWidth - 25,
                y: height - logoHeight - 15,
                width: logoWidth,
                height: logoHeight,
            });

            // Bottom Center Footer Text
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
        console.log(`[stampPdfFile] Successfully stamped: ${path.basename(pdfPath)}`);
        return true;
    } catch (e) {
        console.error(`[stampPdfFile] Failed to stamp PDF ${path.basename(pdfPath)}:`, e.message);
        return false;
    }
}

module.exports = {
    stampPdfFile
};

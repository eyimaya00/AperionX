const fs = require('fs');
const path = require('path');
const { stampPdfFile } = require('../utils/stamp_pdf');

const uploadsDir = path.join(__dirname, '../uploads');

async function run() {
    try {
        if (!fs.existsSync(uploadsDir)) {
            console.error("Uploads directory does not exist.");
            process.exit(1);
        }

        const files = fs.readdirSync(uploadsDir);
        const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
        
        console.log(`Found ${pdfFiles.length} PDF files in uploads directory to stamp.`);
        
        let successCount = 0;
        for (const file of pdfFiles) {
            const pdfPath = path.join(uploadsDir, file);
            const success = await stampPdfFile(pdfPath);
            if (success) successCount++;
        }
        
        console.log(`Completed. Stamped ${successCount}/${pdfFiles.length} PDFs.`);
        process.exit(0);
    } catch (e) {
        console.error("Batch stamping runner failed:", e);
        process.exit(1);
    }
}

run();

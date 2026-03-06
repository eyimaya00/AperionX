
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function diagnose() {
    console.log('--- 🔍 Sistem Teşhis Başlatılıyor ---\n');

    // 1. Google Drive Test
    console.log('1. Google Drive Testi:');
    try {
        const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
        const folderId = process.env.DRIVE_FOLDER_ID;

        if (!fs.existsSync(keyPath)) {
            throw new Error(`Service account dosyası bulunamadı: ${keyPath}`);
        }

        const key = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
        console.log(`   - Servis Hesabı: ${key.client_email}`);
        console.log(`   - Klasör ID: ${folderId}`);

        const auth = new google.auth.GoogleAuth({
            keyFile: keyPath,
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });

        const drive = google.drive({ version: 'v3', auth });
        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: 'files(id, name)',
        });

        const files = res.data.files || [];
        console.log(`   - ✅ Drive erişimi başarılı! Klasörde ${files.length} dosya bulundu.`);
        files.forEach(f => console.log(`     - ${f.name} (${f.id})`));
    } catch (err: any) {
        console.error(`   - ❌ Drive Hatası: ${err.message}`);
        console.log('     İpucu: Klasörü servis hesabı mailiyle "Görüntüleyici" olarak paylaştığınızdan emin olun.');
    }

    // 2. Gemini AI Test
    console.log('\n2. Gemini AI Testi:');
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('GEMINI_API_KEY bulunamadı.');

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        console.log('   - AI ile selamlaşılıyor...');
        const result = await model.generateContent('Merhaba, bu bir test mesajıdır.');
        console.log('   - ✅ AI Yanıtı:', result.response.text().trim());
    } catch (err: any) {
        console.error(`   - ❌ AI Hatası: ${err.message}`);
        if (err.message.includes('403')) {
            console.log('     İpucu: API anahtarınız sızdırılmış (leaked) olabilir veya geçersizdir. Yeni bir anahtar oluşturun.');
        }
    }

    console.log('\n--- 🏁 Teşhis Tamamlandı ---');
}

diagnose();

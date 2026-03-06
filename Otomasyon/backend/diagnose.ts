
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function diagnose() {
    console.log('--- 🔍 Gelişmiş Teşhis Başlatılıyor ---\n');

    // 1. Sistem ve Saat Kontrolü
    console.log('1. Sistem Bilgileri:');
    console.log(`   - Zaman (UTC): ${new Date().toISOString()}`);
    console.log(`   - Çalışma Dizini: ${process.cwd()}`);

    // 2. Google Drive Test
    console.log('\n2. Google Drive Testi:');
    try {
        const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
        const folderId = process.env.DRIVE_FOLDER_ID;

        if (!fs.existsSync(keyPath)) {
            throw new Error(`Service account dosyası bulunamadı: ${keyPath}`);
        }

        const keyStr = fs.readFileSync(keyPath, 'utf-8');
        const key = JSON.parse(keyStr);

        console.log(`   - Servis Hesabı: ${key.client_email}`);
        console.log(`   - Proje ID: ${key.project_id}`);
        console.log(`   - Klasör ID: ${folderId}`);

        // Private key format kontrolü
        if (!key.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
            console.error('   - ❌ Hata: Private key formatı bozuk görünüyor (header eksik).');
        }

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: key.client_email,
                private_key: key.private_key.replace(/\\n/g, '\n'), // Kaçış karakterlerini düzelt
            },
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });

        const drive = google.drive({ version: 'v3', auth });
        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: 'files(id, name)',
        });

        const files = res.data.files || [];
        console.log(`   - ✅ Drive erişimi başarılı! Klasörde ${files.length} dosya bulundu.`);
    } catch (err: any) {
        console.error(`   - ❌ Drive Hatası: ${err.message}`);
        if (err.message.includes('JWT Signature')) {
            console.log('     İpucu: Bu hata genellikle private_key dosyasının yanlış kopyalanması veya sunucu saatinin çok yanlış olmasından kaynaklanır.');
        }
    }

    // 3. Gemini AI Test
    console.log('\n3. Gemini AI Testi:');
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('GEMINI_API_KEY bulunamadı.');

        const genAI = new GoogleGenerativeAI(apiKey);

        console.log('   - Mevcut Modeller Listeleniyor...');
        // SDK üzerinden model listesi çekmeyi deneyelim (SDK 0.24+ için)
        // Not: SDK sürümüne göre bu değişebilir, her zaman çalışmayabilir ama deneyelim.

        const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro"];
        let success = false;

        for (const m of models) {
            try {
                process.stdout.write(`   - Model Deneniyor (${m})... `);
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent('Hi');
                console.log(`✅ Başarılı! Yanıt: ${result.response.text().trim()}`);
                success = true;
                break;
            } catch (e: any) {
                console.log(`❌ Hata: ${e.message.split('\n')[0]}`);
            }
        }

        if (!success) {
            console.error('\n   - 🛑 Hiçbir model çalışmadı. Lütfen API anahtarınızı ve Google AI Studio projenizi kontrol edin.');
        }
    } catch (err: any) {
        console.error(`   - ❌ AI Hatası: ${err.message}`);
        console.log('     Denenecek Alternatif Modeller: gemini-pro, gemini-1.5-flash-latest');
    }

    console.log('\n--- 🏁 Teşhis Tamamlandı ---');
}

diagnose();

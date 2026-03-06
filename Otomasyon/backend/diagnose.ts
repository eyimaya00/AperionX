
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function diagnose() {
    console.log('--- 🔍 AI Model Teşhis Başlatılıyor ---\n');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('❌ Hata: GEMINI_API_KEY bulunamadı.');
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    console.log('1. API Anahtarı mevcut. Modeller test ediliyor...\n');

    // Bu liste en yaygın çalışan modellerdir
    const models = [
        "gemini-flash-latest",
        "gemini-2.5-flash",
        "gemini-1.5-flash",
        "gemini-pro"
    ];

    for (const m of models) {
        try {
            process.stdout.write(`   - Deneniyor: ${m} ... `);
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent('Hi');
            const text = result.response.text();
            console.log(`✅ ÇALIŞTI! Yanıt: ${text.trim().substring(0, 20)}...`);
        } catch (e: any) {
            console.log(`❌ HATA: ${e.message.split('\n')[0]}`);
        }
    }

    console.log('\n2. SDK Bilgisi ve Alternatif Kontrol:');
    try {
        // Not: Bazı SDK versiyonlarında listModels() doğrudan mevcut olmayabilir
        // ancak hata mesajındaki 404 çok spesifik. 
        console.log('   - İpucu: Eğer tümü 404 veriyorsa, Google AI Studio\'da projenizin/anahtarın "Gemini API" için aktif olduğundan emin olun.');
    } catch (err) { }

    console.log('\n--- 🏁 Teşhis Tamamlandı ---');
}

diagnose();

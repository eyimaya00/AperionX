import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

// .env'den anahtarı alıyoruz
const apiKey = process.env.GEMINI_API_KEY;

// Gemini başlatma (sadece key varsa)
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export interface AIMetadataResult {
    title: string;
    description: string;
    tags: string[];
}

/**
 * Verilen ham açıklama ve etiketlerden YouTube Shorts için optimize edilmiş metadata üretir.
 * 
 * @param rawDescription Kaynak platformdaki (Instagram/TikTok) orijinal açıklama
 * @param rawTags Kaynak platformdaki orijinal hashtag'ler
 * @returns {AIMetadataResult} Optimize edilmiş başlık, açıklama ve etiketler
 */
export async function generateYouTubeMetadata(
    rawDescription: string,
    rawTags: string[]
): Promise<AIMetadataResult> {
    if (!genAI) {
        logger.warn('GEMINI_API_KEY tanımlı değil. AI metadata üretimi atlanıyor.');
        return {
            title: '',
            description: rawDescription,
            tags: rawTags,
        };
    }

    try {
        const prompt = `
Aşağıda bir Instagram/TikTok videosuna ait orijinal açıklama ve etiketler bulunuyor.
Lütfen bu bilgilerden yola çıkarak bir YouTube Shorts videosu için İZLENME VE ETKİLEŞİM ODAKLI (SEO Uyumlu) metadata oluştur. Sen profesyonel bir metin yazarı (copywriter) ve YouTube algoritma uzmanısın.

KURALLAR:
1. "title": Maksimum 60 karakter uzunluğunda, "Kanca (Hook)" içeren, MERAK UYANDIRAN, TIKLAMA ODAKLI ve emojilerle desteklenmiş bir başlık ("Bunu Kimse Bilmiyor! 😱", "X Yapmayı Bırakın 🛑", "Hayatınızı Kurtaracak İpucu 🤯" tarzında). Sadece bilgi vermekten kaçın, duygulara hitap et.
2. "description": 
   - İlk cümle: İzleyiciyi videonun sonuna kadar tutacak güçlü bir kanca cümlesi ("Eğer X yapıyorsanız, bu videoyu sonuna kadar izleyin!").
   - Gövde Bölümü: Orijinal bağlamı detaylandırarak anlatan ve dikkat çekmek için bol emoji kullanan, akıcı, bilgilendirici, SEO dostu, anahtar kelime zengini 2-3 cümlelik bir paragraf. Videonun ana sürprizini bozma.
   - **ÖNEMLİ:** Açıklamanın EN SONUNA izleyiciyi etkileşime davet edecek şekilde mutlaka şu metni tam olarak ekle (alt alta satırlarda olmalarına dikkat et):
"Daha fazlası için takipte kal ve sitemize göz at! 👇
🔗 Website: www.aperionx.com
📸 Instagram: @aperionx"
3. "tags": İlgili algoritmaları tetikleyecek, arama hacmi en yüksek 15 adet anahtar kelime/hashtag. (Videoya özel niş etiketlerin yanı sıra kitleyi genişletecek "shorts, viral, trend, fyp" gibi geniş etiketleri karma olarak kullan. Her biri kamerasız ve boşluksuz tek kelime olacak, '#' işareti OLMADAN, virgülle ayrılmış değil sade dizi formatında).

ORİJİNAL AÇIKLAMA:
${rawDescription}

ORİJİNAL ETİKETLER:
${rawTags.join(', ')}
`;

        const schema: Schema = {
            type: SchemaType.OBJECT,
            properties: {
                title: {
                    type: SchemaType.STRING,
                    description: "YouTube Shorts title",
                },
                description: {
                    type: SchemaType.STRING,
                    description: "YouTube Shorts description",
                },
                tags: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.STRING,
                    },
                    description: "YouTube Shorts tags without #",
                },
            },
            required: ["title", "description", "tags"],
        };

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.7,
            },
        });

        logger.info('Google Gemini ile metadata optimize ediliyor...');

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        if (!responseText) {
            throw new Error('Gemini boş yanıt döndürdü.');
        }

        const parsedResult = JSON.parse(responseText) as AIMetadataResult;

        // Güvenlik kontrolleri
        if (!parsedResult.title || !parsedResult.description || !Array.isArray(parsedResult.tags)) {
            throw new Error('Gemini dönüş formatı hatalı.');
        }

        logger.info(`AI Metadata başarıyla oluşturuldu: "${parsedResult.title}"`);
        return parsedResult;

    } catch (error: any) {
        logger.error(`AI Metadata oluşturma hatası: ${error.message}`);

        // Hata durumunda fallback olarak orijinal değerleri dön
        return {
            title: '',
            description: rawDescription,
            tags: rawTags,
        };
    }
}
/**
 * Bir video dosyasını doğrudan analiz eder (Multimodal).
 * Gemini videoyu "izler" ve içeriğine göre metadata üretir.
 */
export async function analyzeVideoWithGemini(filePath: string): Promise<AIMetadataResult> {
    if (!genAI) {
        logger.warn('GEMINI_API_KEY tanımlı değil. Video analizi atlanıyor.');
        return { title: 'Yeni Video', description: '', tags: [] };
    }

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json",
                // responseSchema defined in generateYouTubeMetadata can be reused or simplified
                temperature: 0.7,
            },
        });

        const videoBuffer = fs.readFileSync(filePath);
        const videoData = {
            inlineData: {
                data: videoBuffer.toString('base64'),
                mimeType: 'video/mp4',
            },
        };

        const prompt = `
Bu videoyu izle ve YouTube Shorts için en uygun, İZLENME VE ETKİLEŞİM ODAKLI (SEO Uyumlu) metadata bilgilerini (JSON formatında) üret. Sen profesyonel bir metin yazarı (copywriter) ve YouTube algoritma uzmanısın.
Videonun içeriği nedir, ne anlatıyor, en dikkat çekici anları nelerdir analiz et.
        
Döneceğin JSON formatı:
{
  "title": "...",
  "description": "...",
  "tags": ["tag1", "tag2", ...]
}

KURALLAR:
1. "title": Maksimum 60 karakter uzunluğunda, "Kanca (Hook)" içeren, MERAK UYANDIRAN, TIKLAMA ODAKLI ve emojilerle desteklenmiş bir başlık. Düz bir özet olmasın, izleyiciyi tıklamaya ikna etsin!
2. "description":
   - İlk cümle kanca olmalı ("Bunu biliyor muydunuz? 😲", "Sonuna kadar izleyin!").
   - Gövde Bölümü: Videoyu anlatan SEO uyumlu, emojili, akıcı 2-3 cümle.
   - Sonuna şunu ekle: "Daha fazlası için takipte kal ve sitemize göz at! 👇\\n🔗 Website: www.aperionx.com\\n📸 Instagram: @aperionx"
3. "tags": Videoyu en iyi yansıtan niş etiketler + "shorts, viral, trend" gibi geniş kitle etiketlerini harmanlayarak toplam 15 hashtag (# işareti olmadan dizi olarak).
`;

        logger.info(`AI videoyu izliyor ve analiz ediyor: ${path.basename(filePath)}...`);

        const result = await model.generateContent([prompt, videoData]);
        const responseText = result.response.text();

        const parsedResult = JSON.parse(responseText) as AIMetadataResult;
        logger.info(`AI Video Analizi Başarılı: "${parsedResult.title}"`);

        return parsedResult;

    } catch (error: any) {
        logger.error(`AI Video Analiz Hatası: ${error.message}`);
        return {
            title: path.parse(filePath).name,
            description: 'Otomatik analiz başarısız oldu.',
            tags: ['shorts', 'automation'],
        };
    }
}

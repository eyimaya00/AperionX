import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });
const apiKey = process.env.GEMINI_API_KEY;

async function test() {
    console.log("Testing generateYouTubeMetadata RAW...");
    const rawDescription = "🔬 Rejenerasyonun Ustası: Planaria (Tatlı Su Yassı Solucanı) \nBölündükçe çoğalan bu muazzam canlı...";
    const rawTags = ["planaria", "biyoloji", "mikroskopi", "kökhücre"];

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
            title: { type: SchemaType.STRING },
            description: { type: SchemaType.STRING },
            tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
        },
        required: ["title", "description", "tags"],
    };

    const genAI = new GoogleGenerativeAI(apiKey!);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.7,
        },
    });

    try {
        console.log("Sending prompt to Gemini...");
        const result = await model.generateContent(prompt);
        console.log("RAW RESPONSE TEXT:");
        console.log(result.response.text());
        console.log("JSON PARSED:");
        console.log(JSON.parse(result.response.text()));
    } catch (e: any) {
        console.error("ERROR GENERATING CONTENT:", e.message);
    }
}

test();

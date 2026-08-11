const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testPdf() {
    let logoBase64 = '';
    try {
        const logoPath = path.join(__dirname, '..', 'uploads', 'logo.png');
        if (fs.existsSync(logoPath)) {
            logoBase64 = fs.readFileSync(logoPath).toString('base64');
        }
    } catch (e) {}

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <style>
        @page { size: A4 portrait; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 24px 36px 18px 36px; line-height: 1.35; background: #fff; -webkit-print-color-adjust: exact; }
        .header { text-align: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #6366f1; }
        .header img { height: 36px; width: auto; margin-bottom: 4px; }
        .header h1 { font-size: 14px; font-weight: 700; color: #0f172a; letter-spacing: 0.5px; text-transform: uppercase; }
        .header p { font-size: 9px; color: #64748b; margin-top: 2px; }
        
        .intro-p { font-size: 8.8px; color: #475569; margin-bottom: 8px; text-align: justify; line-height: 1.35; }
        
        .section-block { margin-bottom: 6px; }
        .section-title { font-size: 9.2px; font-weight: 700; color: #312e81; margin-bottom: 2px; }
        .bullet-list { margin: 0; padding-left: 14px; }
        .bullet-list li { font-size: 8.4px; color: #334155; margin-bottom: 2px; line-height: 1.32; text-align: justify; }
        
        .fingerprint-section { background: #f8fafc; border: 1.5px solid #6366f1; border-radius: 8px; padding: 10px 16px; margin: 10px 0 8px 0; }
        .fingerprint-section h2 { font-size: 10px; font-weight: 700; color: #4338ca; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; letter-spacing: 0.3px; }
        
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; }
        .info-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dashed #e2e8f0; font-size: 8.5px; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #475569; }
        .info-value { color: #0f172a; font-weight: 600; }
        
        .footer { text-align: center; margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 8px; color: #94a3b8; }
        .footer .badge { display: inline-block; background: #4f46e5; color: white; padding: 2px 10px; border-radius: 12px; font-size: 8px; font-weight: 600; letter-spacing: 0.4px; margin-bottom: 3px; }
    </style>
</head>
<body>
    <div class="header">
        ${logoBase64 ? '<img src="data:image/png;base64,' + logoBase64 + '" alt="AperionX Logo">' : '<h2 style="color: #6366f1; font-size: 20px;">AperionX</h2>'}
        <h1>Yazar Yayın ve Kullanım İzni Beyanı</h1>
        <p>Dijital Sözleşme Belgesi</p>
    </div>

    <p class="intro-p">
        Bu beyan, <strong>AperionX</strong> platformunda ("Platform") içerik üreten yazarların ("Yazar"), bugüne kadar ürettikleri ve bundan sonra üretecekleri tüm eserlerin (makale, inceleme, deneme vb.) yayınlanma, kullanım ve dağıtım koşullarını düzenlemektedir. Platforma içerik gönderen veya geçmişte göndermiş olan her Yazar, aşağıdaki koşulları peşinen kabul etmiş sayılır:
    </p>

    <div class="section-block">
        <div class="section-title">1. Özgünlük ve Yasal Sorumluluk</div>
        <ul class="bullet-list">
            <li>AperionX platformuna bugüne kadar gönderdiğim ve gelecekte göndereceğim tüm içeriklerin bizzat kendi eserim olduğunu, intihal (kopyalama) içermediğini ve üçüncü şahısların (kişi veya kurumların) telif haklarını hiçbir şekilde ihlal etmediğini beyan ederim.</li>
            <li>Yazılarımda kullandığım her türlü alıntı, veri veya kaynağı akademik ve etik kurallara uygun şekilde referanslandırdığımı taahhüt ederim.</li>
            <li>İçeriklerimin yayınlanması sonucunda doğabilecek telif hakkı ihlalleri dahil olmak üzere, her türlü hukuki, cezai ve mali sorumluluğun tamamen şahsıma ait olduğunu kabul ederim.</li>
        </ul>
    </div>

    <div class="section-block">
        <div class="section-title">2. Yayın İzni ve Kapsam (Dijital Lisans)</div>
        <ul class="bullet-list">
            <li>Eserlerimin AperionX web sitesinde, resmi sosyal medya hesaplarında, e-posta bültenlerinde ve platformun diğer yayın organlarında süresiz olarak yayınlanmasına, dijital ortamda umuma iletilmesine ve arşivlenmesine gayrikabili rücu (geri alınamaz) şekilde izin veriyorum.</li>
            <li>Bu iznin, eserlerimin mülkiyet haklarının tamamen devri anlamına gelmediğini; eser sahibi sıfatımın korunduğunu, ancak AperionX'e içerikleri dilediği zaman yayınlama ve yayından kaldırma yetkisi tanıyan geniş kapsamlı bir kullanım lisansı verdiğimi onaylıyorum.</li>
        </ul>
    </div>

    <div class="section-block">
        <div class="section-title">3. Ekip Ayrılıkları ve İçeriklerin Durumu</div>
        <ul class="bullet-list">
            <li>İleride AperionX yazar kadrosundan kendi isteğimle ayrılsam veya ilişiğim kesilse dahi; daha önce yazmış olduğum ve platformda yayınlanmış olan içeriklerin yayında kalmaya devam etmesi veya yayından kaldırılması konusundaki tek inisiyatifin AperionX yönetimine ait olduğunu kabul ederim.</li>
        </ul>
    </div>

    <div class="section-block">
        <div class="section-title">4. Editöryal Düzenleme Yetkisi</div>
        <ul class="bullet-list">
            <li>AperionX editörlerinin, gönderdiğim içeriklerin ana fikrini, bağlamını ve bütünlüğünü bozmamak şartıyla; yazım kuralları, noktalama, paragraf yapısı, okunabilirlik, başlıklandırma ve görsel seçimi gibi konularda gerekli gördüğü teknik ve editoryal düzenlemeleri yapma hakkına sahip olduğunu onaylıyorum.</li>
        </ul>
    </div>

    <div class="section-block">
        <div class="section-title">5. Mali Hükümler</div>
        <ul class="bullet-list">
            <li>AperionX yönetimi ile aramızda ıslak imzalı veya resmi bir maddi sözleşme bulunmadığı sürece, gönüllülük esasıyla ürettiğim bu içeriklerin yayınlanması karşılığında platformdan geçmişe veya geleceğe dönük herhangi bir telif ücreti, hak ediş veya maddi talepte bulunmayacağımı beyan ve kabul ederim.</li>
        </ul>
    </div>

    <div class="fingerprint-section">
        <h2>🔒 DİJİTAL PARMAK İZİ BİLGİLERİ</h2>
        <div class="info-grid">
            <div class="info-row"><span class="info-label">Yazar Adı Soyadı:</span><span class="info-value">Fatma Kaplan</span></div>
            <div class="info-row"><span class="info-label">Kayıtlı E-posta:</span><span class="info-value">fatma@aperionx.com</span></div>
            <div class="info-row"><span class="info-label">Onay Tarihi ve Saati:</span><span class="info-value">11.08.2026 - 20:55:21</span></div>
            <div class="info-row"><span class="info-label">İşlem Yapılan IP Adresi:</span><span class="info-value">78.173.82.21, 172.69.109.11</span></div>
        </div>
    </div>

    <div class="footer">
        <div class="badge">DİJİTAL OLARAK ONAYLANMIŞTIR</div>
        <p>Bu belge, yazarın dijital ortamda onayladığı sözleşmenin resmi kopyasıdır.</p>
        <p>AperionX &copy; ${new Date().getFullYear()} &mdash; Tüm hakları saklıdır.</p>
    </div>
</body>
</html>`;

    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '12mm', right: '12mm' } });
    await browser.close();

    const pdfPath = path.join(__dirname, 'test_output.pdf');
    fs.writeFileSync(pdfPath, pdfBuffer);
    console.log('PDF saved to:', pdfPath);

    const pdfParse = require('pdf-parse');
    const data = await pdfParse(pdfBuffer);
    console.log('PDF Total Pages:', data.numpages);
}

testPdf().catch(console.error);

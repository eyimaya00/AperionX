/**
 * Smart SEO Meta Generator for AperionX
 * Generates high-CTR, intent-focused SEO titles, meta descriptions, and keywords
 * while keeping the original on-page H1 / editorial title unchanged for readers.
 */

function stripHtml(html) {
    if (!html) return '';
    return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanText(text) {
    if (!text) return '';
    return stripHtml(text)
        .replace(/["'""'']/g, '')
        .replace(/&quot;/g, '')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

function buildSmartSEO({ type = 'article', title = '', excerpt = '', category = '', tags = '' }) {
    const rawTitle = cleanText(title) || 'AperionX Bilim';
    // Remove trailing "- AperionX" if author already wrote it
    const baseTitle = rawTitle.replace(/\s*[-–—|]\s*AperionX.*$/i, '').trim();
    const rawExcerpt = cleanText(excerpt);
    const cat = cleanText(category) || (type === 'experiment' ? 'Deney' : (type === 'gundem' ? 'Gündem' : 'Bilim'));

    let seoTitle = '';
    let seoDescription = '';
    let keywordList = [];

    // Helper regex to check for common Turkish search intent triggers
    const hasQuestionOrIntent = /\b(nedir|nasıl|neden|nelerdir|hakkında|inceleme|rehber|analizi|anlamı|gelişme|özellikleri)\b/i.test(baseTitle);
    const hasDeney = /\b(deney|deneyi|laboratuvar|reaksiyon|sentez)\b/i.test(baseTitle);

    if (type === 'article') {
        // === 1. MAKALE (ARTICLES) ===
        if (!hasQuestionOrIntent) {
            seoTitle = `${baseTitle} Nedir, Nasıl Çalışır? Bilimsel İnceleme | AperionX`;
        } else {
            seoTitle = `${baseTitle} | AperionX Bilim`;
        }

        const descPrefix = rawExcerpt ? `${rawExcerpt} ` : '';
        seoDescription = `${descPrefix}${baseTitle} konusu hakkında detaylı bilimsel analiz, temel prensipler ve güncel araştırmalar AperionX'te.`.trim();

        keywordList = [
            baseTitle,
            `${baseTitle} nedir`,
            `${baseTitle} nasıl çalışır`,
            `${baseTitle} bilim`,
            `${baseTitle} makalesi`,
            cat ? `${cat} makaleleri` : 'bilim makaleleri',
            'popüler bilim',
            'bilimsel araştırmalar',
            'aperionx bilim'
        ];

    } else if (type === 'experiment') {
        // === 2. DENEY (EXPERIMENTS) ===
        if (!hasDeney) {
            seoTitle = `${baseTitle} Deneyi: Nasıl Yapılır? Malzemeler ve Aşamalar | AperionX`;
        } else if (!hasQuestionOrIntent) {
            seoTitle = `${baseTitle}: Nasıl Yapılır? Aşamalar ve Sonuçlar | AperionX`;
        } else {
            seoTitle = `${baseTitle} | AperionX Deney Laboratuvarı`;
        }

        const descPrefix = rawExcerpt ? `${rawExcerpt} ` : '';
        seoDescription = `${descPrefix}${baseTitle} deneyinin amacı, gerekli malzemeleri, güvenlik önlemleri, adım adım yapılışı ve deney sonuçları AperionX'te.`.trim();

        keywordList = [
            baseTitle,
            hasDeney ? baseTitle : `${baseTitle} deneyi`,
            `${baseTitle} nasıl yapılır`,
            `${baseTitle} malzemeleri`,
            `${baseTitle} aşamaları`,
            cat ? `${cat} deneyleri` : 'fen deneyleri',
            'laboratuvar deneyleri',
            'deney raporu',
            'bilimsel deneyler',
            'aperionx deney'
        ];

    } else if (type === 'gundem') {
        // === 3. BİLİM GÜNDEMİ (NEWS) ===
        const hasHaber = /\b(gündem|haber|haberleri|gelişme|duyuruldu|açıklandı|keşfedildi)\b/i.test(baseTitle);
        if (!hasHaber) {
            seoTitle = `${baseTitle} - Güncel Bilim Haberleri ve Gelişmeler | AperionX`;
        } else {
            seoTitle = `${baseTitle} | AperionX Bilim Gündemi`;
        }

        const descPrefix = rawExcerpt ? `${rawExcerpt} ` : '';
        seoDescription = `${descPrefix}Güncel bilim gelişmeleri: ${baseTitle} haberinin tüm detayları, bilimsel analizi ve son gelişmeler AperionX'te.`.trim();

        keywordList = [
            baseTitle,
            'bilim haberleri',
            'güncel bilim gündemi',
            'son dakika bilim',
            cat ? `${cat} haberleri` : 'bilim ve teknoloji gelişmeleri',
            'bilim dünyası',
            'aperionx gündem'
        ];
    }

    // Append existing author tags
    if (tags) {
        const extraTags = cleanText(tags).split(/[,;\n]+/).map(t => t.trim()).filter(Boolean);
        keywordList.push(...extraTags);
    }

    // Deduplicate keywords
    const uniqueKeywords = Array.from(new Set(keywordList.filter(Boolean))).join(', ');

    // Normalize description length for Google SERP (ideal: 150-160 chars, max ~180 chars)
    if (seoDescription.length > 175) {
        seoDescription = seoDescription.substring(0, 172).trim() + '...';
    }

    return {
        seoTitle,
        seoDescription,
        seoKeywords: uniqueKeywords,
        schemaTitle: seoTitle,
        schemaDescription: seoDescription
    };
}

module.exports = {
    buildSmartSEO,
    cleanText,
    stripHtml
};

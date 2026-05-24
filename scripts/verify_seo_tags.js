const http = require('http');

function fetchUrl(path) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:3000${path}`, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function run() {
    console.log('--- SEO Verification ---');

    // 1. Check Homepage
    console.log('\nChecking Homepage (index.html)...');
    try {
        const homeHtml = await fetchUrl('/');

        // Check Meta Description
        if (homeHtml.includes('AperionX: Bilim, Teknoloji ve Uzay')) {
            console.log('✅ Meta Description Updated');
        } else {
            console.error('❌ Meta Description NOT Updated');
        }

        // Check Keywords
        if (homeHtml.includes('aperion, aperionx, makale, bilim')) {
            console.log('✅ Keywords Updated');
        } else {
            console.error('❌ Keywords NOT Updated');
        }

        // Check WebSite Schema
        if (homeHtml.includes('"@type": "WebSite"')) {
            console.log('✅ WebSite Schema Detected');
        } else {
            console.error('❌ WebSite Schema Missing');
        }
    } catch (e) {
        console.error('Homepage Verification Failed:', e.message);
    }

    // 2. Check Article Detail (Need a slug)
    console.log('\nChecking Article Detail...');
    // We'll try to find a link from the homepage, or just hit a known slug if possible. 
    // Since we don't know a live slug, let's query the API or just rely on manual verification if this is hard.
    // Actually, let's try to fetch sitemap.xml to get a slug.

    try {
        const sitemapXml = await fetchUrl('/sitemap.xml');
        const match = sitemapXml.match(/<loc>.*?\/makale\/(.*?)<\/loc>/);

        if (match && match[1]) {
            const slug = match[1];
            console.log(`Found slug from sitemap: ${slug}`);

            const articleHtml = await fetchUrl(`/makale/${slug}`);

            // Check Breadcrumb Schema
            if (articleHtml.includes('"@type":"BreadcrumbList"') || articleHtml.includes('"@type": "BreadcrumbList"')) {
                console.log('✅ BreadcrumbList Schema Detected');
            } else {
                console.error('❌ BreadcrumbList Schema Missing');
            }

            // Check Article Schema Enhancements
            if (articleHtml.includes('"mainEntityOfPage"')) {
                console.log('✅ mainEntityOfPage Property Detected');
            } else {
                console.error('❌ mainEntityOfPage Property Missing');
            }

            // Check Dynamic Keywords
            if (articleHtml.includes('<meta name="keywords" content="')) {
                console.log('✅ Dynamic Keywords Meta Tag Present');
            } else {
                console.error('❌ Dynamic Keywords Meta Tag Missing');
            }

        } else {
            console.log('⚠️ Could not find an article slug in sitemap to test.');
        }

    } catch (e) {
        console.error('Article Verification Failed:', e.message);
    }
}

run();

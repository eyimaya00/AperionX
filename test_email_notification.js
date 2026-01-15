require('dotenv').config();
const nodemailer = require('nodemailer');
const mysql = require('mysql2/promise');

// CONFIG
const TEST_EMAIL = 'yasineyimaya0@gmail.com'; // Corrected typo from gmaill.com

async function testEmail() {
    console.log('[TEST] Starting Email Notification Test...');

    // 1. Setup DB Connection
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS || process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    // 2. Setup Mail Transporter
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        tls: { rejectUnauthorized: false }
    });

    try {
        console.log('[TEST] Fetching latest article...');
        const [rows] = await pool.query("SELECT * FROM articles WHERE status = 'published' ORDER BY created_at DESC LIMIT 1");

        if (rows.length === 0) {
            console.error('[TEST] No published articles found to test with.');
            return;
        }

        const article = rows[0];
        console.log(`[TEST] Found article: ${article.title}`);

        const siteUrl = 'https://aperionx.com'; // Or dynamic
        const articleLink = `${siteUrl}/makale/${article.slug}`;
        const logoUrl = `${siteUrl}/uploads/logo.png`;
        const heroImage = article.image_url ?
            (article.image_url.startsWith('http') ? article.image_url : `${siteUrl}/${article.image_url}`) :
            `${siteUrl}/uploads/default-hero.jpg`;

        // 3. Prepare HTML Template
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; }
                .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background-color: #0f172a; padding: 20px; text-align: center; }
                .logo { max-width: 150px; height: auto; }
                .hero-image { width: 100%; height: 250px; object-fit: cover; }
                .content { padding: 30px; color: #334155; }
                .tag { display: inline-block; background-color: #e0e7ff; color: #4f46e5; padding: 4px 12px; border-radius: 50px; font-size: 12px; font-weight: bold; margin-bottom: 10px; }
                .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 10px 0; line-height: 1.3; }
                .excerpt { font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 25px; }
                .button-container { text-align: center; margin: 30px 0; }
                .read-btn { background-color: #4f46e5; color: #ffffff !important; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3); }
                .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <img src="${logoUrl}" alt="AperionX" class="logo">
                </div>
                <img src="${heroImage}" alt="${article.title}" class="hero-image">
                <div class="content">
                    <span class="tag">YENİ MAKALE</span>
                    <h1 class="title">${article.title}</h1>
                    <p class="excerpt">${article.excerpt || 'Bilim ve teknolojinin derinliklerine yolculuk...'}</p>
                    
                    <div class="button-container">
                        <a href="${articleLink}" class="read-btn">Hemen Oku</a>
                    </div>
                </div>
                <div class="footer">
                    <p>&copy; 2025 AperionX. Tüm hakları saklıdır.</p>
                    <p>Bu e-postayı AperionX üyesi olduğunuz için alıyorsunuz.</p>
                </div>
            </div>
        </body>
        </html>
        `;

        // 4. Send Email
        console.log(`[TEST] Sending email to ${TEST_EMAIL}...`);
        const info = await transporter.sendMail({
            from: '"AperionX Bülten" <' + process.env.SMTP_USER + '>',
            to: TEST_EMAIL,
            subject: `✨ Yeni Makale: ${article.title}`,
            html: htmlContent
        });

        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);

    } catch (e) {
        console.error('❌ Error sending email:', e);
    } finally {
        pool.end();
    }
}

testEmail();

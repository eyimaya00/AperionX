
// Helper: Send New Article Notification to All Users
async function sendNewArticleNotification(articleId) {
    try {
        console.log(`[EMAIL-NOTIF] Starting notification process for Article ID: ${articleId}`);

        // 1. Fetch Article Details with Author Name
        const [rows] = await pool.query(`
            SELECT a.*, u.fullname as author_name 
            FROM articles a 
            LEFT JOIN users u ON a.author_id = u.id 
            WHERE a.id = ?
        `, [articleId]);

        if (rows.length === 0) {
            console.error('[EMAIL-NOTIF] Article not found.');
            return;
        }

        const article = rows[0];
        console.log(`[EMAIL-NOTIF] Sending for: ${article.title}`);

        // 2. Fetch All Standard Users (role='user')
        const [users] = await pool.query("SELECT email FROM users WHERE role = 'user' AND email IS NOT NULL");
        if (users.length === 0) {
            console.log('[EMAIL-NOTIF] No users found to notify.');
            return;
        }

        const recipientEmails = users.map(u => u.email);
        console.log(`[EMAIL-NOTIF] Found ${recipientEmails.length} recipients.`);

        // 3. Prepare Email Content
        // Use dynamic host or hardcoded production URL
        const siteUrl = 'https://aperionx.com';
        const articleLink = `${siteUrl}/makale/${article.slug}`;
        const logoPath = path.join(__dirname, 'uploads', 'logo.png');

        // Ensure logo exists, otherwise fallback? 
        // We know it exists now.

        const heroImage = article.image_url ?
            (article.image_url.startsWith('http') ? article.image_url : `${siteUrl}/${article.image_url}`) :
            `${siteUrl}/uploads/default-hero.jpg`;

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; }
                .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background-color: #0f172a; padding: 25px; text-align: center; }
                .logo { max-width: 180px; height: auto; display: block; margin: 0 auto; }
                .hero-image { width: 100%; height: 250px; object-fit: cover; }
                .content { padding: 30px; color: #334155; }
                .tag { display: inline-block; background-color: #e0e7ff; color: #4f46e5; padding: 4px 12px; border-radius: 50px; font-size: 12px; font-weight: bold; margin-bottom: 15px; }
                .title { font-size: 26px; font-weight: 800; color: #0f172a; margin: 10px 0 15px 0; line-height: 1.3; }
                .author { font-size: 14px; color: #64748b; margin-bottom: 20px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
                .excerpt { font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 30px; }
                .button-container { text-align: center; margin: 30px 0; }
                .read-btn { background-color: #4f46e5; color: #ffffff !important; padding: 16px 36px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4); }
                .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                   <a href="${siteUrl}" style="text-decoration:none;">
                        <img src="cid:unique-logo-id" alt="AperionX" class="logo" style="color: white; font-size: 24px; font-weight: bold;">
                   </a>
                </div>
                <a href="${articleLink}" style="text-decoration:none; display:block;">
                    <img src="${heroImage}" alt="${article.title}" class="hero-image">
                </a>
                <div class="content">
                    <span class="tag">YENİ MAKALE</span>
                    <h1 class="title">${article.title}</h1>
                    
                    <div class="author">
                        <span>🖊️ Yazar: <span style="color: #0f172a;">${article.author_name || 'AperionX Yazarı'}</span></span>
                    </div>

                    <p class="excerpt">${article.excerpt || 'Bilim ve teknolojinin derinliklerine yolculuk...'}</p>
                    
                    <div class="button-container">
                        <a href="${articleLink}" class="read-btn">Makaleyi Oku</a>
                    </div>
                </div>
                <div class="footer">
                    <p>&copy; 2025 AperionX. Bilimin Sınırlarında.</p>
                    <p>Bu bülten üyelerimize özel otomatik olarak gönderilmiştir.</p>
                </div>
            </div>
        </body>
        </html>
        `;

        // 4. Send Emails (Using BCC to send to all at once, or loop)
        // Using BCC is better for privacy and performance than individual sends if list is small (<500).
        // Since we are using Gmail SMTP, let's chunk it or loop carefully. 
        // For simplicity with nodemailer and potential rate limits, let's send individually but with a small delay or use BCC if list is small.
        // Let's use BCC for now.

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

        // Send in batches of 50 to avoid limits or weirdness? 
        // Let's just send one mail with all users in BCC.

        const info = await transporter.sendMail({
            from: '"AperionX Bülten" <' + process.env.SMTP_USER + '>',
            to: process.env.SMTP_USER, // To self
            bcc: recipientEmails,      // Valid recipients
            subject: `✨ Yeni Makale: ${article.title}`,
            html: htmlContent,
            attachments: [
                {
                    filename: 'logo.png',
                    path: logoPath,
                    cid: 'unique-logo-id'
                }
            ]
        });

        console.log(`[EMAIL-NOTIF] Sent successfully. Message ID: ${info.messageId}`);

    } catch (e) {
        console.error('[EMAIL-NOTIF] Error:', e);
    }
}

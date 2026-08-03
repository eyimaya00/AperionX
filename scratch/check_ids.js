const fs = require('fs');
const html = fs.readFileSync('c:/Users/eyima/.gemini/antigravity/scratch/AperionX/views/admin.html', 'utf8');
const ids = [
    'site_title', 'site_description', 'logo_height', 'contact_email', 'social_twitter',
    'social_instagram', 'social_linkedin', 'social_youtube', 'social_tiktok', 'social_spotify',
    'spotify_announcement_active', 'spotify_announcement_text', 'spotify_podcast_embed',
    'spotify_podcast_title', 'spotify_podcast_desc', 'footer_desc', 'footer_copyright',
    'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_secure', 'hero_btn_text',
    'showcase_badge', 'showcase_title', 'showcase_desc', 'showcase_btn_text', 'auth_login_text',
    'auth_signup_text', 'articles_hero_title', 'articles_hero_title_color', 'articles_hero_desc',
    'articles_page_slider_title', 'articles_page_list_title', 'about_hero_title',
    'about_hero_title_color', 'about_hero_desc', 'newsletter_section_title', 'newsletter_section_desc'
];
const missing = ids.filter(id => !html.includes('id="' + id + '"'));
console.log('Missing IDs:', missing);

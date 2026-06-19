import os

html_files = [f for f in os.listdir('views') if f.endswith('.html')]

for f in html_files:
    p = os.path.join('views', f)
    with open(p, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Inject mobile theme toggle
    replacement = """    <div class="mobile-menu" id="mobileMenu">
        <div class="mobile-actions" style="padding: 20px 20px 0 20px;">
            <button class="theme-toggle" id="mobileThemeToggle" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; background: var(--card-bg); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem;">
                <i class="ph ph-moon"></i> Temayı Değiştir
            </button>
        </div>
"""
    if '<div class="mobile-menu" id="mobileMenu">\n' in content:
        content = content.replace('<div class="mobile-menu" id="mobileMenu">\n', replacement)
    
    with open(p, 'w', encoding='utf-8') as file:
        file.write(content)
